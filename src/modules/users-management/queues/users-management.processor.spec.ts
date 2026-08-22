import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Job } from 'bull';
import { UsersManagementProcessor } from './users-management.processor';
import { LoggerService } from '../../../common/loggers/logger.service';
import { UserCreatedEvent } from '../../../common/events/user-created.event';
import { User } from '../domain/user.schema';

describe('UsersManagementProcessor', () => {
  let processor: UsersManagementProcessor;
  let mockLoggerService: jest.Mocked<LoggerService>;
  let mockUserModel: { create: jest.Mock };

  const job = {
    data: new UserCreatedEvent('Test User', 'test@example.com'),
  } as Job<UserCreatedEvent>;

  beforeEach(async () => {
    mockLoggerService = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      contextName: '',
    } as any;

    mockUserModel = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersManagementProcessor,
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    processor = module.get<UsersManagementProcessor>(UsersManagementProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('verify', () => {
    it('creates a MongoDB document from the event payload', async () => {
      mockUserModel.create.mockResolvedValue({ _id: 'abc', ...job.data });

      await processor.verify(job);

      expect(mockUserModel.create).toHaveBeenCalledWith(job.data);
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        expect.stringContaining('USER CREATED'),
      );
    });

    it('propagates the error when persistence fails', async () => {
      mockUserModel.create.mockRejectedValue(new Error('Mongo unavailable'));

      await expect(processor.verify(job)).rejects.toThrow('Mongo unavailable');
    });
  });

  describe('sendEmail', () => {
    it('logs the welcome email for the given address', async () => {
      await processor.sendEmail(job);

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        expect.stringContaining(job.data.email),
      );
    });
  });
});
