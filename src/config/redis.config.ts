import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  // Optional: unset for the local docker-compose Redis. Managed Redis with an
  // AUTH token (e.g. ElastiCache) also requires TLS (REDIS_TLS=true).
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true',
}));
