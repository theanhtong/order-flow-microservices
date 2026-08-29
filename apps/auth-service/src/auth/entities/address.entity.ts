import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('addresses')
export class Address {
  @ApiProperty({ description: 'Address unique ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Recipient Name', example: 'John Doe' })
  @Column()
  recipientName: string;

  @ApiProperty({ description: 'Contact Phone Number', example: '0901234567' })
  @Column()
  phone: string;

  @ApiProperty({ description: 'Full Delivery Address', example: '123 High Tech Street, Ward 1, District 1, Ho Chi Minh City' })
  @Column()
  address: string;

  @ApiPropertyOptional({ description: 'Delivery Instruction or Note', example: 'Call before delivery' })
  @Column({ nullable: true })
  note?: string;

  @ApiProperty({ description: 'Is default shipping address', example: true })
  @Column({ default: false })
  isDefault: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
