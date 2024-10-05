import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { NodeEnvironment } from '../envconfig';

export const loggerModule = LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    return {
      pinoHttp: {
        transport:
          configService.getOrThrow('NODE_ENV') !== NodeEnvironment.Production
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                },
              }
            : undefined,
        level: 'info',
        serializers: {
          req: (req) => {
            req.body = req.raw.body;
            return req;
          },
        },
      },
    };
  },
});
