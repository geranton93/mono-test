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
    // Handle case when fromCode and toCode are the same
    if (fromCode === toCode) {
      this.logger.log('From and to currency codes are the same. Rate is 1.');
      return 1;
    }

    // Try to find direct rate
    const directRate = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === fromCode && rate.currencyCodeB === toCode,
    );

    if (directRate) {
      let rate: number;

      if (directRate.rateCross) {
        rate = directRate.rateCross;
      } else if (fromCode === 980 && directRate.rateSell) {
        rate = 1 / directRate.rateSell;
      } else if (fromCode === 980 && directRate.rateBuy) {
        rate = 1 / directRate.rateBuy;
      } else if (directRate.rateBuy) {
        rate = directRate.rateBuy;
      } else if (directRate.rateSell) {
        rate = directRate.rateSell;
      }

      if (rate) {
        this.logger.log(
          `Using direct rate from ${fromCode} to ${toCode}: ${rate}`,
        );
        return rate;
      }
    }

    // Try to find inverse rate
    const inverseRate = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === toCode && rate.currencyCodeB === fromCode,
    );

    if (inverseRate) {
      let rate: number;

      if (inverseRate.rateCross) {
        rate = 1 / inverseRate.rateCross;
      } else if (toCode === 980 && inverseRate.rateBuy) {
        // Converting from another currency to UAH
        rate = inverseRate.rateBuy;
      } else if (toCode === 980 && inverseRate.rateSell) {
        rate = inverseRate.rateSell;
      } else if (inverseRate.rateSell) {
        rate = 1 / inverseRate.rateSell;
      } else if (inverseRate.rateBuy) {
        rate = 1 / inverseRate.rateBuy;
      }

      if (rate) {
        this.logger.log(
          `Using inverse rate from ${toCode} to ${fromCode}, inverted rate: ${rate}`,
        );
        return rate;
      }
    }

    // Try using UAH as intermediary
    const baseCurrencyCode = 980; // UAH

    // From 'from' currency to UAH
    const fromToBaseRate = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === fromCode &&
        rate.currencyCodeB === baseCurrencyCode,
    );

    // From 'to' currency to UAH
    const toToBaseRate = exchangeRates.find(
      (rate) =>
        rate.currencyCodeA === toCode &&
        rate.currencyCodeB === baseCurrencyCode,
    );

    if (fromToBaseRate && toToBaseRate) {
      // From 'from' currency to UAH
      const rateFromToBase =
        fromToBaseRate.rateCross ||
        fromToBaseRate.rateBuy ||
        fromToBaseRate.rateSell;

      // From 'to' currency to UAH (will invert)
      const rateToToBase =
        toToBaseRate.rateCross || toToBaseRate.rateSell || toToBaseRate.rateBuy;

      if (rateFromToBase && rateToToBase) {
        const rateBaseToTo = 1 / rateToToBase;
        const rate = rateFromToBase * rateBaseToTo;
        this.logger.log(`Using UAH as intermediary, rate: ${rate}`);
        return rate;
      }
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
