import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${dto.sku}" already exists`);
    }

    const product = this.productRepository.create(dto);
    return await this.productRepository.save(product);
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
