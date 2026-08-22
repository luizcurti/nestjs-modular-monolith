import { Test, TestingModule } from '@nestjs/testing';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { UploaderS3Service } from './uploaderS3.service';
import { LoggerService } from '../loggers/logger.service';
import { S3Provider } from './s3-provider.constant';
import s3Config from '../../config/s3.config';

describe('UploaderS3Service', () => {
  let service: UploaderS3Service;
  let mockS3Client: { send: jest.Mock };
  let mockLoggerService: jest.Mocked<LoggerService>;

  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

  beforeEach(async () => {
    mockS3Client = {
      send: jest.fn(),
    };

    mockLoggerService = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      contextName: '',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploaderS3Service,
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: S3Provider, useValue: mockS3Client },
        {
          provide: s3Config.KEY,
          useValue: { bucket: 'test-bucket', qrCodeExpires: 3600 },
        },
      ],
    }).compile();

    service = module.get<UploaderS3Service>(UploaderS3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('sends a PutObjectCommand with the decoded image to the configured bucket', async () => {
      mockS3Client.send.mockResolvedValue({});

      await service.upload(base64Image, 'reference-1');

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const command = mockS3Client.send.mock.calls[0][0] as PutObjectCommand;
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'image/reference-1.png',
        ContentType: 'image/png',
      });
    });

    it('propagates the error when the upload to S3 fails', async () => {
      mockS3Client.send.mockRejectedValue(new Error('S3 unavailable'));

      await expect(service.upload(base64Image, 'reference-1')).rejects.toThrow(
        'S3 unavailable',
      );
    });
  });
});
