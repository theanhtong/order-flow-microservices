import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID of the product being ordered', example: '98765432-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity of product', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Price per unit', example: 50.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Recipient Name', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiProperty({ description: 'Phone Number', example: '0844499424', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Street Address', example: '123 Nguyen Hue', required: false })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({ description: 'GHN Ward Code', example: '20308', required: false })
  @IsString()
  @IsOptional()
  toWardCode?: string;

  @ApiProperty({ description: 'GHN District ID', example: 1442, required: false })
  @IsNumber()
  @IsOptional()
  toDistrictId?: number;

  @ApiProperty({ description: 'Payment Method (COD, VNPAY, BANK_QR, etc)', example: 'COD', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'List of items in the order' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
