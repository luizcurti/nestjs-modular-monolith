import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  bucket: process.env.QRCODE_BUCKET,
  qrCodeExpires: Number(process.env.QRCODE_EXPIRES ?? 0),
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}));
