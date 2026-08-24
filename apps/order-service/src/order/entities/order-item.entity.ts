import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @ApiProperty({ example: 'a7f8ea94-ec6d-4cd2-8a7c-1aecf8670b6d' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '98765432-e89b-12d3-a456-426614174000' })
  @Column({ name: 'product_id' })
  productId: string;

  @ApiProperty({ example: 2 })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ example: 50.0 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ example: '9e24320b-3d4d-45e0-946a-87007b73f657' })
  @Column({ name: 'order_id' })
  orderId: string;
}
