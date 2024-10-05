import { Controller, Post, Body, Logger } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { ConvertCurrencyDto } from './dtos/convert-currency.dto';
import { ConvertCurrencyResponseDto } from './dtos/convert-currency-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

@ApiTags('Currency Conversion')
@Controller({
  path: 'currency',
  version: '1',
})
export class CurrencyController {
  private readonly logger = new Logger(CurrencyController.name);

  constructor(private readonly currencyService: CurrencyService) {}

  @Post('convert')
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({
    status: 200,
    description: 'Conversion successful',
    type: ConvertCurrencyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async convertCurrency(
    @Body() convertCurrencyDto: ConvertCurrencyDto,
  ): Promise<ConvertCurrencyResponseDto> {
    const { from, to, amount } = convertCurrencyDto;
    this.logger.log(`Received conversion request: ${amount} ${from} to ${to}`);

    const convertedAmount = await this.currencyService.convertCurrency(
      from,
      to,
      amount,
    );

    return {
      from,
      to,
      amount,
      convertedAmount,
    };
  }
}
