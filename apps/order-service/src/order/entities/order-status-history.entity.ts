import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { Order } from './order.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('order_status_history')
export class OrderStatusHistory {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '9e24320b-3d4d-45e0-946a-87007b73f657' })
  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne('Order', (order: any) => order.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status: OrderStatus;

  @ApiProperty({ example: 'Order placed by customer', required: false })
  @Column({ type: 'text', nullable: true })
  note?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
