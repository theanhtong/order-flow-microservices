import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReserveStockDto {
  @ApiProperty({ description: 'Quantity to reserve or release', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
