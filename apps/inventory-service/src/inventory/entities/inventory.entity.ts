import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('inventories')
export class Inventory {
  @ApiProperty({ example: 'b1234567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '98765432-e89b-12d3-a456-426614174000' })
  @Column({ name: 'product_id', unique: true })
  productId: string;

  @ApiProperty({ example: 'PROD-SKU-001' })
  @Column({ unique: true })
  sku: string;

  @ApiProperty({ example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ example: 0 })
  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
