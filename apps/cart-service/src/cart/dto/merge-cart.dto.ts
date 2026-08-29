import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddCartItemDto } from './add-cart-item.dto';

export class MergeCartDto {
  @ApiPropertyOptional({ description: 'Optional Guest Session ID to merge from Redis' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiPropertyOptional({ description: 'Array of guest cart items to merge upon login', type: [AddCartItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  guestItems?: AddCartItemDto[];
}
