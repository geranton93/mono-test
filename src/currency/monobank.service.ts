import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as currencyCodes from 'currency-codes';
import { firstValueFrom } from 'rxjs';
import { CurrencyRate } from '../common/interfaces/currency-rate.interface';

@Injectable()
export class MonobankService {
  private readonly logger = new Logger(MonobankService.name);
  private readonly monobankApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.monobankApiUrl = this.configService.get<string>('monobank__api_url');
  }

  public getMonobankCurrencyCode(isoCode: string): number {
    const currency = currencyCodes.code(isoCode);
    if (!currency) {
      this.logger.error(`Invalid ISO currency code: ${isoCode}`);
      throw new BadRequestException(`Invalid ISO currency code: ${isoCode}`);
    }
    return parseInt(currency.number, 10);
  }

  public async getAllRates(): Promise<CurrencyRate[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.monobankApiUrl),
      );
      const rates: CurrencyRate[] = response.data;
      this.logger.log('Fetched exchange rates from Monobank API');
      return rates;
    } catch (error) {
      this.logger.error(`Failed to fetch rates: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch rates from Monobank API');
    }
  }
}
