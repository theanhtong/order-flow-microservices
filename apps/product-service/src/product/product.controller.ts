import { Controller, Post, Get, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Product } from './entities/product.entity';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: Product })
  async createProduct(@Body() dto: CreateProductDto): Promise<Product> {
    return await this.productService.createProduct(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by UUID' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product details', type: Product })
  async getProductById(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return await this.productService.getProductById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active products' })
  @ApiResponse({ status: 200, description: 'List of active products', type: [Product] })
  async getAllProducts(): Promise<Product[]> {
    return await this.productService.getAllProducts();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product details' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Updated product', type: Product })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return await this.productService.updateProduct(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Deactivated product', type: Product })
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return await this.productService.deleteProduct(id);
  }
}
