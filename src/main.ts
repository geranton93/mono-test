import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Configuration, NodeEnvironment } from './envconfig';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === NodeEnvironment.Development
        ? ['log', 'debug', 'error', 'warn']
        : ['error', 'warn'],
  });

  const config = app.get(ConfigService<Configuration, true>);

  app.useGlobalPipes(new ValidationPipe());

  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Swagger setup
  const docBuilder = new DocumentBuilder()
    .setTitle('Currency Converter API')
    .setDescription(
      'API for converting currencies using Monobank exchange rates',
    )
    .build();
  const document = SwaggerModule.createDocument(app, docBuilder);
  SwaggerModule.setup('api', app, document);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useLogger(app.get(Logger));
  app.enableCors();
  await app.listen(config.get('nodePort'));
}

bootstrap();
