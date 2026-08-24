import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ description: 'Product UUID', example: '98765432-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'SKU code', example: 'PROD-SKU-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Initial stock quantity', example: 100, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;
}
