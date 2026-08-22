import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from './user.resolver';
import { UsersService } from '../domain/users.service';
import { CreateUserDto } from './dtos/create-users.dto';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('UserResolver', () => {
  let resolver: UserResolver;
  let mockUsersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      welcomeNewUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .setLogger(mockLogger)
      .compile();

    resolver = module.get<UserResolver>(UserResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should have usersService injected', () => {
    expect((resolver as any).usersService).toBeDefined();
    expect((resolver as any).usersService).toBe(mockUsersService);
  });

  it('should be instance of UserResolver', () => {
    expect(resolver).toBeInstanceOf(UserResolver);
  });

  describe('findAll', () => {
    it('should call usersService.findAll and return results', async () => {
      mockUsersService.findAll.mockResolvedValue([mockUser]);

      const result = await resolver.findAll();

      expect(mockUsersService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockUser]);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await resolver.findAll();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockUsersService.findAll.mockRejectedValue(new Error('Service error'));

      await expect(resolver.findAll()).rejects.toThrow('Service error');
    });
  });

  describe('findUser', () => {
    it('should return user by id', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await resolver.findUser(1);

      expect(mockUsersService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const result = await resolver.findUser(99);

      expect(result).toBeNull();
    });

    it('should return null (not a GraphQL error) when the service throws NotFoundException', async () => {
      mockUsersService.findById.mockRejectedValue(
        new NotFoundException('User with id 99 not found'),
      );

      const result = await resolver.findUser(99);

      expect(result).toBeNull();
    });

    it('should rethrow errors that are not NotFoundException', async () => {
      mockUsersService.findById.mockRejectedValue(new Error('Database down'));

      await expect(resolver.findUser(1)).rejects.toThrow('Database down');
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
    };

    it('should call usersService.create with correct arguments', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      await resolver.create(createUserDto);

      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should return created user', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await resolver.create(createUserDto);

      expect(result).toEqual(mockUser);
    });

    it('should handle service errors', async () => {
      mockUsersService.create.mockRejectedValue(new Error('Service error'));

      await expect(resolver.create(createUserDto)).rejects.toThrow(
        'Service error',
      );
    });
  });
});
