import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from '../domain/users.service';
import { CreateUserDto } from './dtos/create-users.dto';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .setLogger(mockLogger)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
    };

    it('should create a user successfully', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockUsersService.create.mockRejectedValue(error);

      await expect(controller.create(createUserDto)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 2, name: 'User 2' }];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(mockUsersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(mockUsersService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockUsersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Service error');
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(mockUsersService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should propagate NotFoundException from service', async () => {
      mockUsersService.findById.mockRejectedValue(
        new NotFoundException('Not found'),
      );

      await expect(controller.findOne(99)).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      mockUsersService.update.mockResolvedValue(updated);

      const result = await controller.update(1, { name: 'New Name' });

      expect(mockUsersService.update).toHaveBeenCalledWith(1, {
        name: 'New Name',
      });
      expect(result).toEqual(updated);
    });

    it('should propagate NotFoundException from service', async () => {
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('Not found'),
      );

      await expect(controller.update(99, { name: 'Ghost' })).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockUsersService.delete.mockResolvedValue(undefined);

      await expect(controller.delete(1)).resolves.toBeUndefined();
      expect(mockUsersService.delete).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException from service', async () => {
      mockUsersService.delete.mockRejectedValue(
        new NotFoundException('Not found'),
      );

      await expect(controller.delete(99)).rejects.toThrow('Not found');
    });
  });
});
