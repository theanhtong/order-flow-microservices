import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory, OrderStatus } from './order-status-history.entity';

export { OrderStatus };

@Entity('orders')
export class Order {
  @ApiProperty({ example: '9e24320b-3d4d-45e0-946a-87007b73f657' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column({ name: 'customer_id' })
  customerId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({ example: 100.0 })
  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @ApiProperty({ example: 'Changed my mind', required: false })
  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string;

  @ApiProperty({ type: () => [OrderItem] })
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @ApiProperty({ type: () => [OrderStatusHistory] })
  @OneToMany(() => OrderStatusHistory, (history) => history.order, { cascade: true })
  statusHistory: OrderStatusHistory[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
