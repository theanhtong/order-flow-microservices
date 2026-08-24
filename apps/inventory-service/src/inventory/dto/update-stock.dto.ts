import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ description: 'Quantity delta to add or subtract', example: 10 })
  @IsNumber()
  quantityDelta: number;
}
