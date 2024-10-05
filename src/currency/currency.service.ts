import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { MonobankService } from './monobank.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CurrencyRate } from '../common/interfaces/currency-rate.interface';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly monobankService: MonobankService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async getExchangeRates(): Promise<CurrencyRate[]> {
    const cacheKey = 'exchangeRates';
    let exchangeRates = await this.cacheManager.get<CurrencyRate[]>(cacheKey);

    if (!exchangeRates) {
      this.logger.log(
        'Exchange rates not found in cache. Fetching from Monobank API.',
      );
      exchangeRates = await this.monobankService.getAllRates();
      await this.cacheManager.set(cacheKey, exchangeRates);
    } else {
      this.logger.log('Using cached exchange rates.');
    }

    return exchangeRates;
  }

  private findExchangeRate(
    exchangeRates: CurrencyRate[],
    fromCode: number,
    toCode: number,
  ): number {
    // Try to find direct rate
    const directRate = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === fromCode && rate.currencyCodeB === toCode,
    );

    if (directRate && (directRate.rateBuy || directRate.rateCross)) {
      const rate = directRate.rateCross || directRate.rateBuy;
      this.logger.log(
        `Using direct rate from ${fromCode} to ${toCode}: ${rate}`,
      );
      return rate;
    }

    // Try to find inverse rate
    const inverseRate = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === toCode && rate.currencyCodeB === fromCode,
    );

    if (inverseRate && (inverseRate.rateSell || inverseRate.rateCross)) {
      const inverseRateValue = inverseRate.rateCross || inverseRate.rateSell;
      const rate = 1 / inverseRateValue;
      this.logger.log(
        `Using inverse rate from ${toCode} to ${fromCode}, inverted rate: ${rate}`,
      );
      return rate;
    }

    // Try using UAH as intermediary
    const baseCurrencyCode = 980; // UAH

    const fromToBase = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === fromCode &&
        rate.currencyCodeB === baseCurrencyCode,
    );

    const baseToTarget = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === baseCurrencyCode &&
        rate.currencyCodeB === toCode,
    );

    if (
      fromToBase &&
      baseToTarget &&
      (fromToBase.rateBuy || fromToBase.rateCross) &&
      (baseToTarget.rateSell || baseToTarget.rateCross)
    ) {
      const rateBuy = fromToBase.rateCross || fromToBase.rateBuy;
      const rateSell = baseToTarget.rateCross || baseToTarget.rateSell;
      const rate = rateBuy / rateSell;
      this.logger.log(`Using UAH as intermediary, rate: ${rate}`);
      return rate;
    }

    this.logger.error(
      `Exchange rate not found for codes ${fromCode} to ${toCode}`,
    );
    throw new BadRequestException(
      `Exchange rate not found for the provided currencies.`,
    );
  }

  public async convertCurrency(
    from: string,
    to: string,
    amount: number,
  ): Promise<number> {
    this.logger.log(`Converting ${amount} ${from} to ${to}`);

    if (amount <= 0) {
      this.logger.error('Amount must be greater than zero');
      throw new BadRequestException('Amount must be greater than zero');
    }

    const exchangeRates = await this.getExchangeRates();

    const fromCode = this.monobankService.getMonobankCurrencyCode(from);
    const toCode = this.monobankService.getMonobankCurrencyCode(to);

    const rate = this.findExchangeRate(exchangeRates, fromCode, toCode);

    const convertedAmount = amount * rate;
    this.logger.log(`Converted amount: ${convertedAmount.toFixed(2)} ${to}`);
    return parseFloat(convertedAmount.toFixed(2));
  }
}
