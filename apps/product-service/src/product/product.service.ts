import { Injectable, Inject, Logger, NotFoundException, BadRequestException, Optional, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import Redis from 'ioredis';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductCreatedEvent } from '@orderflow-microservices/shared';

@Injectable()
export class ProductService implements OnModuleInit {
  private readonly logger = new Logger('ProductService');
  private readonly CACHE_TTL_SECONDS = 60;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
    @Optional()
    @Inject('REDIS_CLIENT')
    private readonly redisClient?: Redis,
  ) { }

  async onModuleInit() {
    try {
      const count = await this.productRepository.count();
      if (count === 0) {
        this.logger.log('Database is empty. Auto-seeding randomized products into product-db...');
        await this.seedRandomProducts(25);
      }
    } catch (err) {
      this.logger.warn(`Auto-seeding check skipped/failed: ${err.message}`);
    }
  }

  async seedRandomProducts(count: number = 20): Promise<Product[]> {
    const categories = ['Laptops', 'Phones', 'Tablets', 'Wearables', 'Audio', 'Accessories'];

    const brandNames = {
      Laptops: ['MacBook Pro', 'MacBook Air', 'Mac Studio', 'Dell XPS', 'ThinkPad X1', 'Asus ROG', 'Surface Laptop'],
      Phones: ['iPhone 15 Pro', 'Galaxy S24 Ultra', 'Pixel 8 Pro', 'Xiaomi 14', 'OnePlus 12', 'iPhone 15'],
      Tablets: ['iPad Pro M4', 'iPad Air M2', 'Galaxy Tab S9', 'iPad Mini 6', 'Surface Pro 10'],
      Wearables: ['Apple Watch Ultra 2', 'Galaxy Watch 6', 'Garmin Fenix 7', 'Apple Watch Series 9'],
      Audio: ['AirPods Max', 'AirPods Pro 2', 'Sony WH-1000XM5', 'Bose QuietComfort', 'HomePod Mini'],
      Accessories: ['Pro Display XDR', 'Magic Keyboard', 'MagSafe Charger', 'Studio Display', 'Thunderbolt Dock'],
    };

    const variants = ['16"', '14"', '256GB', '512GB', '1TB', 'Titanium', 'Space Black', 'OLED 13"', 'Wireless', 'Type-C'];

    const seededProducts: Product[] = [];

    for (let i = 1; i <= count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const namesList = brandNames[category];
      const baseName = namesList[Math.floor(Math.random() * namesList.length)];
      const variant = variants[Math.floor(Math.random() * variants.length)];

      const name = `${baseName} ${variant}`;
      const sku = `SKU-${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const price = parseFloat((Math.floor(Math.random() * 3500) + 49.99).toFixed(2));
      const description = `High-performance ${category.toLowerCase()} device with premium ${variant} finish.`;

      const existing = await this.productRepository.findOne({ where: { sku } });
      if (!existing) {
        const product = this.productRepository.create({
          name,
          sku,
          price,
          category,
          description,
          isActive: true,
        });
        const saved = await this.productRepository.save(product);
        seededProducts.push(saved);
      }
    }

    await this.invalidateProductCache();
    this.logger.log(`Successfully seeded ${seededProducts.length} randomized products into product-db`);
    return seededProducts;
  }

  private async invalidateProductCache(productId?: string) {
    if (!this.redisClient) return;
    try {
      await this.redisClient.del('products:all');
      if (productId) {
        await this.redisClient.del(`products:${productId}`);
      }
      this.logger.log(`Invalidated Redis cache for products`);
    } catch (err) {
      this.logger.warn(`Redis cache invalidation skipped/failed: ${err.message}`);
    }
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${dto.sku}" already exists`);
    }

    const product = this.productRepository.create(dto);
    const savedProduct = await this.productRepository.save(product);

    await this.invalidateProductCache(savedProduct.id);

    try {
      this.rabbitClient.emit(
        'product.created',
        new ProductCreatedEvent({
          productId: savedProduct.id,
          sku: savedProduct.sku,
          quantity: dto.quantity ?? 0,
        }),
      ).subscribe();
      this.logger.log(`Emitted product.created event for Product #${savedProduct.id} (SKU: ${savedProduct.sku})`);
    } catch (error) {
      this.logger.error(`Failed to emit product.created event for Product #${savedProduct.id}`, error);
    }

    return savedProduct;
  }

  async getProductById(id: string): Promise<Product> {
    const cacheKey = `products:${id}`;
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.log(`[CACHE HIT] Served Product #${id} from Redis`);
          return JSON.parse(cached);
        }
      } catch (err) {
        this.logger.warn(`Redis get failed: ${err.message}`);
      }
    }

    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    if (this.redisClient) {
      try {
        await this.redisClient.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(product));
        this.logger.log(`[CACHE SET] Cached Product #${id} in Redis (${this.CACHE_TTL_SECONDS}s TTL)`);
      } catch (err) {
        this.logger.warn(`Redis set failed: ${err.message}`);
      }
    }

    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    const cacheKey = 'products:all';
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.log(`[CACHE HIT] Served all products list from Redis`);
          return JSON.parse(cached);
        }
      } catch (err) {
        this.logger.warn(`Redis get failed: ${err.message}`);
      }
    }

    const products = await this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (this.redisClient) {
      try {
        await this.redisClient.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(products));
        this.logger.log(`[CACHE SET] Cached all products list in Redis (${this.CACHE_TTL_SECONDS}s TTL)`);
      } catch (err) {
        this.logger.warn(`Redis set failed: ${err.message}`);
      }
    }

    return products;
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.getProductById(id);
    Object.assign(product, dto);
    const updated = await this.productRepository.save(product);
    await this.invalidateProductCache(id);
    return updated;
  }

  async deleteProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    product.isActive = false;
    const deleted = await this.productRepository.save(product);
    await this.invalidateProductCache(id);
    return deleted;
  }
}
