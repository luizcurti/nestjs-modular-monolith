import { registerAs } from '@nestjs/config';

const ConnectionDatabaseType: Record<string, string> = {
  postgres: 'postgres',
};

export default registerAs('database', () => ({
  type: ConnectionDatabaseType[process.env.TYPEORM_TYPE ?? 'postgres'],
  host: process.env.TYPEORM_HOST,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
  port: Number(process.env.TYPEORM_PORT ?? 5432),
  // TYPEORM_SSL=true encrypts the connection without verifying the server
  // certificate (no CA bundle shipped in the image): for a managed database
  // reached inside a private network, e.g. RDS, which requires TLS by default.
  ssl: process.env.TYPEORM_SSL === 'true',
}));
