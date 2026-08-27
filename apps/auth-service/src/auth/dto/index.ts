import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
