import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';
import { Configuration, NodeEnvironment } from '../envconfig';

export const configModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object<Configuration>({
    NODE_ENV: Joi.string()
      .required()
      .valid(
        NodeEnvironment.Development.toString(),
        NodeEnvironment.Test.toString(),
        NodeEnvironment.Production.toString(),
      )
      .default(NodeEnvironment.Test.toString()),

    nodePort: Joi.number().default(3000),

    redis__host: Joi.string().default('localhost'),
    redis__port: Joi.number().default(6379),
    redis__ttl: Joi.number().default(3600),

    monobank__api_url: Joi.string().required(),
  }),
});
