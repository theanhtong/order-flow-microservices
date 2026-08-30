import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../entities/shipment.entity';

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus, example: ShipmentStatus.DELIVERING })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiProperty({ example: 'GHN-88234910', required: false })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiProperty({ example: 'GHN', required: false })
  @IsOptional()
  @IsString()
  carrierCode?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({ example: '0844499424', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123 Nguyen Hue', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '20308', required: false })
  @IsOptional()
  @IsString()
  toWardCode?: string;

  @ApiProperty({ example: 1442, required: false })
  @IsOptional()
  @IsNumber()
  toDistrictId?: number;
}
