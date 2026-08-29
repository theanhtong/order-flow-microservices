import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@orderflow-microservices/shared';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password (min 6 characters)', example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token string' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class CreateUserAdminDto {
  @ApiProperty({ description: 'User email address', example: 'operator@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password (min 6 characters)', example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Full name', example: 'System Operator' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Role to assign', enum: UserRole, example: UserRole.OPERATOR })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}

export class UpdateStatusDto {
  @ApiProperty({ description: 'Active status', example: false })
  @IsBoolean()
  isActive: boolean;
}

export class CreateAddressDto {
  @ApiProperty({ description: 'Recipient Full Name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({ description: 'Contact Phone Number', example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Full Delivery Address', example: '123 High Tech Street, Ward 1, District 1, Ho Chi Minh City' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Delivery Instruction or Note', example: 'Call before delivery' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Set as default address', example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ description: 'Recipient Full Name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({ description: 'Contact Phone Number', example: '0901234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Full Delivery Address', example: '123 High Tech Street, Ward 1, District 1, Ho Chi Minh City' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Delivery Instruction or Note', example: 'Call before delivery' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Set as default address', example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
