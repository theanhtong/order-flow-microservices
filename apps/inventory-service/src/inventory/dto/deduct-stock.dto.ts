import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeductStockDto {
  @ApiProperty({ description: 'Quantity to deduct from stock', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
