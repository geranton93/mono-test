import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import * as request from 'supertest';
import { MonobankService } from '../src/currency/monobank.service';
import { flushRedis } from './utils/redis.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let monobankService: MonobankService;
  let cacheManager: Cache;

  const mockExchangeRates = [
    {
      currencyCodeA: 840, // USD
      currencyCodeB: 978, // EUR
      date: 1728105373,
      rateBuy: 0.85,
      rateSell: 0.86,
    },
    {
      currencyCodeA: 978, // EUR
      currencyCodeB: 840, // USD
      date: 1728105373,
      rateBuy: 1.15,
      rateSell: 1.16,
    },
    {
      currencyCodeA: 840, // USD
      currencyCodeB: 980, // UAH
      date: 1728105373,
      rateBuy: 27.0,
      rateSell: 27.5,
    },
    {
      currencyCodeA: 978, // EUR
      currencyCodeB: 980, // UAH
      date: 1728105373,
      rateBuy: 32.0,
      rateSell: 32.5,
    },
    {
      currencyCodeA: 826, // GBP
      currencyCodeB: 980, // UAH
      date: 1728105373,
      rateBuy: 37.0,
      rateSell: 37.5,
    },
  ];

  beforeAll(async () => {
    await flushRedis();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    monobankService = moduleFixture.get<MonobankService>(MonobankService);
    cacheManager = moduleFixture.get<Cache>(CACHE_MANAGER);

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await flushRedis();
    await app.close();
    const redisClient = (cacheManager.store as any).getClient();
    await redisClient.quit();
  });

  beforeEach(async () => {
    await flushRedis();
    jest.clearAllMocks();
  });

  it('/currency/convert (POST) - Success', async () => {
    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockExchangeRates);

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: 100 })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'EUR',
      amount: 100,
      convertedAmount: 85,
    });
  });

  it('/currency/convert (POST) - Validation Error: Negative Amount', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: -100 })
      .expect(400);

    expect(response.body.message).toContain('amount must be a positive number');
  });

  it('/currency/convert (POST) - Validation Error: Invalid Currency Code', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'XYZ', to: 'EUR', amount: 100 })
      .expect(400);

    expect(response.body.message).toContain(
      'from must be a valid ISO4217 currency code',
    );
  });

  it('/currency/convert (POST) - Missing Required Fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ to: 'EUR', amount: 100 })
      .expect(400);

    expect(response.body.message).toContain('from should not be empty');
  });

  it('/currency/convert (POST) - Invalid Data Types', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: 'one hundred' })
      .expect(400);

    expect(response.body.message).toContain(
      'amount must be a number conforming to the specified constraints',
    );
  });

  it('/currency/convert (POST) - Amount Is Zero', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: 0 })
      .expect(400);

    expect(response.body.message).toContain('amount must be a positive number');
  });

  it('/currency/convert (POST) - Invalid Currency Code Format', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'US', to: 'EUR', amount: 100 })
      .expect(400);

    expect(response.body.message).toContain(
      'from must be a valid ISO4217 currency code',
    );
  });

  it('/currency/convert (POST) - Exchange Rate Not Found', async () => {
    // Mock data without the required exchange rate
    const mockRatesWithoutGBP = mockExchangeRates.filter(
      (rate) => rate.currencyCodeA !== 826 && rate.currencyCodeB !== 826,
    );

    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockRatesWithoutGBP);

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'GBP', amount: 100 })
      .expect(400);

    expect(response.body.message).toContain('Exchange rate not found');
  });

  it('/currency/convert (GET) - Method Not Allowed', async () => {
    await request(app.getHttpServer()).get('/currency/convert').expect(404); // NestJS returns 404 for undefined routes
  });

  it('/currency/convert (POST) - Invalid JSON Payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .set('Content-Type', 'application/json')
      .send('invalid-json')
      .expect(400);

    expect(response.body.message).toContain('Unexpected token');
  });

  it('/currency/convert (POST) - Large Amount', async () => {
    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockExchangeRates);

    const largeAmount = Number.MAX_SAFE_INTEGER;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: largeAmount })
      .expect(201);

    expect(response.body.convertedAmount).toBe(largeAmount * 0.85);
  });

  it('/currency/convert (POST) - Should use cache after initial request', async () => {
    const mockExchangeRates = [
      {
        currencyCodeA: 840, // USD
        currencyCodeB: 978, // EUR
        date: 1728105373,
        rateBuy: 0.85,
        rateSell: 0.86,
      },
    ];

    const getAllRatesSpy = jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockExchangeRates);

    await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: 100 })
      .expect(201);

    expect(getAllRatesSpy).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount: 200 })
      .expect(201);

    expect(getAllRatesSpy).toHaveBeenCalledTimes(1);

    const cachedRates = await cacheManager.get('exchangeRates');
    expect(cachedRates).toEqual(mockExchangeRates);
  });
});
