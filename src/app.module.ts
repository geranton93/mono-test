import { Module } from '@nestjs/common';
import { configModule } from './config/config.module';
import { cacheModule } from './cache/cache.module';
import { loggerModule } from './logger/logger.module';
import { CurrencyModule } from './currency/currency.module';

@Module({
  imports: [configModule, cacheModule, loggerModule, CurrencyModule],
})
export class AppModule {}
