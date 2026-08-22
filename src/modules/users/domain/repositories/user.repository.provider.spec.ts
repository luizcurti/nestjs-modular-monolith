import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  provideUsersRepository,
  UsersRepoDependenciesProvider,
} from './user.repository.provider';
import { UserOrmEntity } from './implementations/users.typeorm.entity';
import { USERS_REPOSITORY_TOKEN } from './user.repository.interface';
import { UsersTypeOrmRepository } from './implementations/users.typeorm.repository';
import { UsersInMemoryRepository } from './implementations/users.in-memory.repository';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('UsersRepositoryProvider', () => {
  let dependenciesProvider: UsersRepoDependenciesProvider;
  let mockRepository: jest.Mocked<Repository<UserOrmEntity>>;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      insert: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepoDependenciesProvider,
        {
          provide: getRepositoryToken(UserOrmEntity),
          useValue: mockRepository,
        },
      ],
    })
      .setLogger(mockLogger)
      .compile();

    dependenciesProvider = module.get<UsersRepoDependenciesProvider>(
      UsersRepoDependenciesProvider,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DATABASE_DATASOURCE;
  });

  describe('UsersRepoDependenciesProvider', () => {
    it('should be defined', () => {
      expect(dependenciesProvider).toBeDefined();
    });

    it('should have typeOrmRepository', () => {
      expect(dependenciesProvider.typeOrmRepository).toBeDefined();
      expect(dependenciesProvider.typeOrmRepository).toBe(mockRepository);
    });
  });

  describe('provideUsersRepository', () => {
    it('should return provider array', () => {
      const providers = provideUsersRepository();

      expect(providers).toHaveLength(2);
      expect(providers[0] as any).toHaveProperty(
        'provide',
        USERS_REPOSITORY_TOKEN,
      );
      expect(providers[0] as any).toHaveProperty('useFactory');
      expect(providers[0] as any).toHaveProperty('inject');
      expect(providers[1]).toBe(UsersRepoDependenciesProvider);
    });

    it('should have correct injection dependencies', () => {
      const providers = provideUsersRepository();

      expect((providers[0] as any).inject).toEqual([
        UsersRepoDependenciesProvider,
      ]);
    });
  });

  describe('provideUsersRepositoryFactory', () => {
    it('should return TypeOrmRepository when DATABASE_DATASOURCE is TYPEORM', async () => {
      process.env.DATABASE_DATASOURCE = 'typeorm';
      jest
        .spyOn(ConfigModule, 'envVariablesLoaded', 'get')
        .mockReturnValue(Promise.resolve());

      const providers = provideUsersRepository();
      const factory = (providers[0] as any).useFactory;
      const result = await factory(dependenciesProvider);

      expect(result).toBeInstanceOf(UsersTypeOrmRepository);
    });

    it('should return InMemoryRepository when DATABASE_DATASOURCE is MEMORY', async () => {
      process.env.DATABASE_DATASOURCE = 'memory';
      jest
        .spyOn(ConfigModule, 'envVariablesLoaded', 'get')
        .mockReturnValue(Promise.resolve());

      const providers = provideUsersRepository();
      const factory = (providers[0] as any).useFactory;
      const result = await factory(dependenciesProvider);

      expect(result).toBeInstanceOf(UsersInMemoryRepository);
    });

    it('should return InMemoryRepository when DATABASE_DATASOURCE is undefined (default)', async () => {
      delete process.env.DATABASE_DATASOURCE;
      jest
        .spyOn(ConfigModule, 'envVariablesLoaded', 'get')
        .mockReturnValue(Promise.resolve());

      const providers = provideUsersRepository();
      const factory = (providers[0] as any).useFactory;
      const result = await factory(dependenciesProvider);

      expect(result).toBeInstanceOf(UsersInMemoryRepository);
    });

    it('should return InMemoryRepository for unknown DATABASE_DATASOURCE', async () => {
      process.env.DATABASE_DATASOURCE = 'unknown';
      jest
        .spyOn(ConfigModule, 'envVariablesLoaded', 'get')
        .mockReturnValue(Promise.resolve());

      const providers = provideUsersRepository();
      const factory = (providers[0] as any).useFactory;
      const result = await factory(dependenciesProvider);

      expect(result).toBeInstanceOf(UsersInMemoryRepository);
    });

    it('should wait for ConfigModule.envVariablesLoaded', async () => {
      const envVariablesLoadedSpy = jest
        .spyOn(ConfigModule, 'envVariablesLoaded', 'get')
        .mockReturnValue(Promise.resolve());
      process.env.DATABASE_DATASOURCE = 'typeorm';

      const providers = provideUsersRepository();
      const factory = (providers[0] as any).useFactory;
      await factory(dependenciesProvider);

      expect(envVariablesLoadedSpy).toHaveBeenCalled();
    });
  });
});
