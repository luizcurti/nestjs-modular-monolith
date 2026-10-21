import { Inject, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigType } from '@nestjs/config';
import { LoggerService } from '../loggers/logger.service';
import { S3Provider } from './s3-provider.constant';
import s3Config from '../../config/s3.config';

export interface S3Result {
  readonly expires: number;
  readonly urlImage: string;
}

@Injectable()
export class UploaderS3Service {
  constructor(
    @Inject(s3Config.KEY)
    private readonly configService: ConfigType<typeof s3Config>,
    private readonly loggerService: LoggerService,
    @Inject(S3Provider)
    private readonly s3Provider: S3Client,
  ) {
    this.loggerService.contextName = UploaderS3Service.name;
  }

  public async upload(base64Image: string, referenceKey: string) {
    this.loggerService.info(`Called method: ${this.upload.name}()`);

    const buffer = Buffer.from(
      base64Image.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );

    const command = new PutObjectCommand({
      Bucket: this.configService.bucket,
      Key: `image/${referenceKey}.png`,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png',
      ContentLength: buffer.length,
    });

    await this.s3Provider.send(command);
  }
}
