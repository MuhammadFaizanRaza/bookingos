import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Sale id to charge' })
  @IsString()
  @IsNotEmpty()
  saleId!: string;

  @ApiPropertyOptional({
    description: 'Amount to charge; defaults to the sale total',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  amount?: number;
}

export class RecordCashPaymentDto {
  @ApiProperty({ description: 'Sale id' })
  @IsString()
  @IsNotEmpty()
  saleId!: string;

  @ApiProperty({ description: 'Cash amount received' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}
