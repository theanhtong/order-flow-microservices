import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ShipmentStatus {
  READY_TO_PICK = 'READY_TO_PICK',
  PICKING = 'PICKING',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  DELIVERY_FAIL = 'DELIVERY_FAIL',
}

@Entity('shipments')
export class Shipment {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '9e24320b-3d4d-45e0-946a-87007b73f657' })
  @Column({ name: 'order_id', unique: true })
  orderId: string;

  @ApiProperty({ enum: ShipmentStatus, example: ShipmentStatus.READY_TO_PICK })
  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.READY_TO_PICK,
  })
  status: ShipmentStatus;

  @ApiProperty({ example: 'GHN' })
  @Column({ name: 'carrier_code', default: 'GHN' })
  carrierCode: string;

  @ApiProperty({ example: 'GHN-88234910' })
  @Column({ name: 'tracking_code' })
  trackingCode: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @Column({ name: 'recipient_name', nullable: true })
  recipientName?: string;

  @ApiProperty({ example: '0844499424', required: false })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({ example: '123 Nguyen Hue', required: false })
  @Column({ nullable: true })
  address?: string;

  @ApiProperty({ example: '20308', required: false })
  @Column({ name: 'to_ward_code', nullable: true })
  toWardCode?: string;

  @ApiProperty({ example: 1442, required: false })
  @Column({ name: 'to_district_id', type: 'int', nullable: true })
  toDistrictId?: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
