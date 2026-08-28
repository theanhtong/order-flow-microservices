import { IsNotEmpty, IsString, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/payment.entity';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Associated Order UUID', example: '26be03d0-9122-432e-86bf-13d4b495e0f1' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Payment amount', example: 1299.99, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Payment Gateway Method', enum: PaymentMethod, example: PaymentMethod.VNPAY })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}

export class WebhookCallbackDto {
  @ApiProperty({ description: 'Gateway Transaction ID', example: 'TXN-99887766' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ description: 'Gateway Result Status', example: 'SUCCESS', enum: ['SUCCESS', 'FAILED'] })
  @IsString()
  @IsNotEmpty()
  status: 'SUCCESS' | 'FAILED';

  @ApiProperty({ description: 'Failure reason if status is FAILED', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
