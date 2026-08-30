import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  COD = 'COD',
  BANK_QR = 'BANK_QR',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  CREDIT_CARD = 'CREDIT_CARD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @ApiProperty({ description: 'Payment record UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated Order UUID', example: '26be03d0-9122-432e-86bf-13d4b495e0f1' })
  @Column()
  orderId: string;

  @ApiProperty({ description: 'Customer UUID', example: '8b405eab-8096-41b2-965d-555afdc64ee8' })
  @Column()
  customerId: string;

  @ApiProperty({ description: 'Payment amount in USD/VND', example: 1299.99 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Payment gateway method', enum: PaymentMethod, example: PaymentMethod.VNPAY })
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.VNPAY,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, example: PaymentStatus.PENDING })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({ description: 'Unique payment gateway transaction ID', example: 'TXN-99887766' })
  @Column({ unique: true })
  transactionId: string;

  @ApiProperty({ description: 'Simulated Payment Gateway checkout URL' })
  @Column()
  paymentUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
