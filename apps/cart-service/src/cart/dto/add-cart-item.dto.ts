import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ description: 'Product ID', example: 'prod-uuid-101' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity of product', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Product SKU', example: 'SKU-LAP-8558' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Product Name', example: 'MacBook Pro M3 Max 16"' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unit Price', example: 3499.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Product Category', example: 'Laptops', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
