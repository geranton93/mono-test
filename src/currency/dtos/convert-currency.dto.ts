import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class ConvertCurrencyDto {
  @ApiProperty({
    description: 'The source currency code (e.g., USD)',
    example: 'USD',
  })
  @IsNotEmpty()
  @IsString()
  @IsISO4217CurrencyCode()
  from: string;

  @ApiProperty({
    description: 'The target currency code (e.g., EUR)',
    example: 'EUR',
  })
  @IsNotEmpty()
  @IsString()
  @IsISO4217CurrencyCode()
  to: string;

  @ApiProperty({
    description: 'The amount to convert',
    example: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
