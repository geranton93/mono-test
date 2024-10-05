import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const cacheModule = CacheModule.registerAsync({
  isGlobal: true,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    store: redisStore,
    host: configService.getOrThrow('redis__host'),
    port: configService.getOrThrow('redis__port'),
    ttl: configService.getOrThrow('redis__ttl'),
  }),
});
