import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { ConvertCurrencyDto } from './dtos/convert-currency.dto';

describe('CurrencyController', () => {
  let controller: CurrencyController;
  let service: CurrencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrencyController],
      providers: [
        {
          provide: CurrencyService,
          useValue: {
            convertCurrency: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CurrencyController>(CurrencyController);
    service = module.get<CurrencyService>(CurrencyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('convertCurrency', () => {
    it('should return converted amount', async () => {
      const dto: ConvertCurrencyDto = {
        from: 'USD',
        to: 'EUR',
        amount: 100,
      };

      jest.spyOn(service, 'convertCurrency').mockResolvedValue(85);

      const result = await controller.convertCurrency(dto);

      expect(result).toEqual({
        from: 'USD',
        to: 'EUR',
        amount: 100,
        convertedAmount: 85,
      });
      expect(service.convertCurrency).toHaveBeenCalledWith('USD', 'EUR', 100);
    });
  });
});
