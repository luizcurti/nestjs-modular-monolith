import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UsersTypeOrmRepository } from './users.typeorm.repository';
import { UserOrmEntity } from './users.typeorm.entity';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('UsersTypeOrmRepository', () => {
  let repository: UsersTypeOrmRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<UserOrmEntity>>;

  const mockUser: UserOrmEntity = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    mockTypeOrmRepository = {
      find: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UsersTypeOrmRepository,
          useFactory: () => new UsersTypeOrmRepository(mockTypeOrmRepository),
        },
      ],
    })
      .setLogger(mockLogger)
      .compile();

    repository = module.get<UsersTypeOrmRepository>(UsersTypeOrmRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    const createData = { name: 'Test User', email: 'test@example.com' };

    it('should save the user and return entity with id', async () => {
      mockTypeOrmRepository.save.mockResolvedValue(mockUser);

      const result = await repository.create(createData);

      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors during creation', async () => {
      mockTypeOrmRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(repository.create(createData)).rejects.toThrow('DB error');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 2, name: 'User 2' }];
      mockTypeOrmRepository.find.mockResolvedValue(mockUsers);

      const result = await repository.findAll();

      expect(mockTypeOrmRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors during find', async () => {
      mockTypeOrmRepository.find.mockRejectedValue(new Error('Query failed'));

      await expect(repository.findAll()).rejects.toThrow('Query failed');
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockTypeOrmRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await repository.findById(1);

      expect(mockTypeOrmRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      mockTypeOrmRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.findById(99);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user and return updated entity', async () => {
      const updatedUser = { ...mockUser, name: 'New Name' };
      mockTypeOrmRepository.update.mockResolvedValue({} as any);
      mockTypeOrmRepository.findOneBy.mockResolvedValue(updatedUser);

      const result = await repository.update(1, { name: 'New Name' });

      expect(mockTypeOrmRepository.update).toHaveBeenCalledWith(1, {
        name: 'New Name',
      });
      expect(result).toEqual(updatedUser);
    });

    it('should return null when user does not exist after update', async () => {
      mockTypeOrmRepository.update.mockResolvedValue({} as any);
      mockTypeOrmRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.update(99, { name: 'Ghost' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should call delete with correct id', async () => {
      mockTypeOrmRepository.delete.mockResolvedValue({} as any);

      await repository.delete(1);

      expect(mockTypeOrmRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle database errors during delete', async () => {
      mockTypeOrmRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(repository.delete(1)).rejects.toThrow('DB error');
    });
  });
});
