import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import * as request from 'supertest';
import { MonobankService } from '../src/currency/monobank.service';
import { flushRedis } from './utils/redis.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CurrencyRate } from '../src/common/interfaces/currency-rate.interface';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let monobankService: MonobankService;
  let cacheManager: Cache;

  const mockExchangeRates: CurrencyRate[] = [
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
    {
      currencyCodeA: 392, // JPY
      currencyCodeB: 980, // UAH
      date: 1728105373,
      rateCross: 0.25,
    },
    {
      currencyCodeA: 985, // PLN
      currencyCodeB: 980, // UAH
      date: 1728105373,
      rateBuy: 7.0,
      rateSell: 7.5,
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

  it('/currency/convert (POST) - Indirect Conversion via UAH (USD to PLN)', async () => {
    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockExchangeRates);

    const amount = 100;

    // Calculate expected converted amount manually
    const usdToUahRate = 27.0; // USD to UAH rateBuy
    const plnToUahRate = 7.5; // PLN to UAH rateSell (we need to invert this)

    const expectedRate = usdToUahRate / plnToUahRate;
    const expectedConvertedAmount = amount * expectedRate;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'PLN', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'PLN',
      amount,
      convertedAmount: parseFloat(expectedConvertedAmount.toFixed(2)),
    });
  });

  it('/currency/convert (POST) - Conversion Involving UAH (UAH to USD)', async () => {
    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockExchangeRates);

    const amount = 2700;

    // UAH to USD conversion
    const usdToUahRateSell = 27.5; // USD to UAH rateSell (we need to invert this)
    const expectedRate = 1 / usdToUahRateSell;
    const expectedConvertedAmount = amount * expectedRate;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'UAH', to: 'USD', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'UAH',
      to: 'USD',
      amount,
      convertedAmount: parseFloat(expectedConvertedAmount.toFixed(2)),
    });
  });

  it('/currency/convert (POST) - Conversion Using rateCross (JPY to UAH)', async () => {
    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockExchangeRates);

    const amount = 1000;

    // JPY to UAH using rateCross
    const jpyToUahRateCross = 0.25; // Given in mock data
    const expectedConvertedAmount = amount * jpyToUahRateCross;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'JPY', to: 'UAH', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'JPY',
      to: 'UAH',
      amount,
      convertedAmount: parseFloat(expectedConvertedAmount.toFixed(2)),
    });
  });

  it('/currency/convert (POST) - No Available Rates (Conversion Should Fail)', async () => {
    // Remove rates for the currencies involved
    const mockRatesWithoutUSDandPLN = mockExchangeRates.filter(
      (rate) =>
        !(
          rate.currencyCodeA === 840 ||
          rate.currencyCodeA === 985 ||
          rate.currencyCodeB === 840 ||
          rate.currencyCodeB === 985
        ),
    );

    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockRatesWithoutUSDandPLN);

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'PLN', amount: 100 })
      .expect(400);

    expect(response.body.message).toContain('Exchange rate not found');
  });

  it('/currency/convert (POST) - Conversion with Missing rateBuy and rateSell', async () => {
    // Mock data with rateCross only
    const mockRatesWithRateCrossOnly = [
      {
        currencyCodeA: 840, // USD
        currencyCodeB: 978, // EUR
        date: 1728105373,
        rateCross: 0.85,
      },
    ];

    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockRatesWithRateCrossOnly);

    const amount = 100;
    const expectedRate = 0.85;
    const expectedConvertedAmount = amount * expectedRate;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'EUR',
      amount,
      convertedAmount: parseFloat(expectedConvertedAmount.toFixed(2)),
    });
  });

  it('/currency/convert (POST) - Conversion When rateCross Is Not Available', async () => {
    // Remove rateCross and provide only rateBuy and rateSell
    const mockRatesWithoutRateCross = [
      {
        currencyCodeA: 840, // USD
        currencyCodeB: 978, // EUR
        date: 1728105373,
        rateBuy: 0.85,
        rateSell: 0.86,
      },
    ];

    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockRatesWithoutRateCross);

    const amount = 100;
    const expectedRate = 0.85; // Using rateBuy
    const expectedConvertedAmount = amount * expectedRate;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'EUR',
      amount,
      convertedAmount: parseFloat(expectedConvertedAmount.toFixed(2)),
    });
  });

  it('/currency/convert (POST) - Conversion with Inverted Rate', async () => {
    // Only inverse rate is available
    const mockRatesWithInverseOnly = [
      {
        currencyCodeA: 978, // EUR
        currencyCodeB: 840, // USD
        date: 1728105373,
        rateBuy: 1.1765,
        rateSell: 1.18,
      },
    ];

    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockRatesWithInverseOnly);

    const amount = 100;
    const inverseRate = 1.18; // Using rateSell
    const expectedRate = 1 / inverseRate;
    const expectedConvertedAmount = parseFloat(
      (amount * expectedRate).toFixed(2),
    );

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'EUR',
      amount,
      convertedAmount: expectedConvertedAmount,
    });
  });

  it('/currency/convert (POST) - Conversion with Missing rateCross and rateBuy', async () => {
    // Only rateSell is available
    const mockRatesWithRateSellOnly = [
      {
        currencyCodeA: 840, // USD
        currencyCodeB: 978, // EUR
        date: 1728105373,
        rateSell: 0.86,
      },
    ];

    jest
      .spyOn(monobankService, 'getAllRates')
      .mockResolvedValue(mockRatesWithRateSellOnly);

    const amount = 100;
    const expectedRate = 0.86; // Using rateSell
    const expectedConvertedAmount = amount * expectedRate;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'EUR', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'EUR',
      amount,
      convertedAmount: parseFloat(expectedConvertedAmount.toFixed(2)),
    });
  });

  it('/currency/convert (POST) - Conversion from and to the Same Currency', async () => {
    const amount = 100;

    const response = await request(app.getHttpServer())
      .post('/currency/convert')
      .send({ from: 'USD', to: 'USD', amount })
      .expect(201);

    expect(response.body).toEqual({
      from: 'USD',
      to: 'USD',
      amount,
      convertedAmount: amount, // Should return the same amount
    });
  });
});
