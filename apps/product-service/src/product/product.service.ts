import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductCreatedEvent } from '@orderflow-microservices/shared';

@Injectable()
export class ProductService {
  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${dto.sku}" already exists`);
    }

    const product = this.productRepository.create(dto);
    const savedProduct = await this.productRepository.save(product);

    // Emit product.created event asynchronously to RabbitMQ (Inventory Service consumer)
    try {
      this.rabbitClient.emit(
        'product.created',
        new ProductCreatedEvent({
          productId: savedProduct.id,
          sku: savedProduct.sku,
          initialQuantity: dto.initialQuantity ?? 0,
        }),
      );
      this.logger.log(`Emitted product.created event for Product #${savedProduct.id} (SKU: ${savedProduct.sku})`);
    } catch (error) {
      this.logger.error(`Failed to emit product.created event for Product #${savedProduct.id}`, error);
    }

    return savedProduct;
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.getProductById(id);
    Object.assign(product, dto);
    return await this.productRepository.save(product);
  }

  async deleteProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    product.isActive = false;
    return await this.productRepository.save(product);
  }
}
