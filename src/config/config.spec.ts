import databaseConfig from './database.config';
import redisConfig from './redis.config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
    delete process.env.TYPEORM_SSL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('redis', () => {
    it('connects without a password or TLS by default', () => {
      expect(redisConfig()).toMatchObject({
        password: undefined,
        tls: false,
      });
    });

    it('uses the AUTH token and TLS when configured', () => {
      process.env.REDIS_PASSWORD = 's3cret';
      process.env.REDIS_TLS = 'true';

      expect(redisConfig()).toMatchObject({ password: 's3cret', tls: true });
    });
  });

  describe('database', () => {
    it('connects without TLS by default', () => {
      expect(databaseConfig().ssl).toBe(false);
    });

    it('enables TLS when TYPEORM_SSL=true', () => {
      process.env.TYPEORM_SSL = 'true';

      expect(databaseConfig().ssl).toBe(true);
    });
  });
});
