import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@orderflow-microservices/shared';
import { Address } from './address.entity';

@Entity('users')
export class User {
  @ApiProperty({ description: 'User unique ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Email address', example: 'operator@example.com' })
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @ApiProperty({ description: 'Full Name', example: 'System Operator' })
  @Column()
  fullName: string;

  @ApiProperty({ description: 'Role level', enum: UserRole, example: UserRole.CUSTOMER })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @ApiProperty({ description: 'Account status', example: true })
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Address, (address) => address.user)
  addresses?: Address[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
