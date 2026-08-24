import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'iPhone 15 Pro Max' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique SKU code', example: 'PROD-SKU-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Price per unit', example: 999.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Product description', example: 'Flagship smartphone', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
