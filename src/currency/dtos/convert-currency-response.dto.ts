import { ApiProperty } from '@nestjs/swagger';

export class ConvertCurrencyResponseDto {
  @ApiProperty({
    example: 'USD',
    description: 'Source currency code (ISO 4217)',
  })
  from: string;

  @ApiProperty({
    example: 'EUR',
    description: 'Target currency code (ISO 4217)',
  })
  to: string;

  @ApiProperty({ example: 100, description: 'Amount to convert' })
  amount: number;

  @ApiProperty({
    example: 85.5,
    description: 'Converted amount in target currency',
  })
  convertedAmount: number;
}
