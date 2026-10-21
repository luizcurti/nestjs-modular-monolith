import { Test, TestingModule } from '@nestjs/testing';
import { CreditController } from './credit-engine.controller';
import { CreditService } from '../domain/credit-engine.service';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('CreditController', () => {
  let controller: CreditController;
  let mockCreditService: jest.Mocked<CreditService>;

  beforeEach(async () => {
    mockCreditService = {
      findAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditController],
      providers: [
        {
          provide: CreditService,
          useValue: mockCreditService,
        },
      ],
    })
      .setLogger(mockLogger)
      .compile();

    controller = module.get<CreditController>(CreditController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return credit engine message', () => {
      const expectedMessage = 'Hello Credit Engine';
      mockCreditService.findAll.mockReturnValue(expectedMessage);

      const result = controller.findAll();

      expect(mockCreditService.findAll).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });

    it('should handle service responses', () => {
      const customMessage = 'Custom Credit Message';
      mockCreditService.findAll.mockReturnValue(customMessage);

      const result = controller.findAll();

      expect(mockCreditService.findAll).toHaveBeenCalled();
      expect(result).toBe(customMessage);
    });
  });
});
