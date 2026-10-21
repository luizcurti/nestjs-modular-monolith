import { UsersInMemoryRepository } from './users.in-memory.repository';

describe('UsersInMemoryRepository', () => {
  let repository: UsersInMemoryRepository;

  beforeEach(() => {
    repository = new UsersInMemoryRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return it with auto-generated id', async () => {
      const result = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should auto-increment ids for multiple users', async () => {
      const u1 = await repository.create({
        name: 'User 1',
        email: 'u1@example.com',
      });
      const u2 = await repository.create({
        name: 'User 2',
        email: 'u2@example.com',
      });

      expect(u1.id).toBe(1);
      expect(u2.id).toBe(2);
    });

    it('should persist user so findAll returns it', async () => {
      await repository.create({ name: 'Test User', email: 'test@example.com' });
      const allUsers = await repository.findAll();

      expect(allUsers).toHaveLength(1);
      expect(allUsers[0]).toHaveProperty('name', 'Test User');
    });

    it('should handle multiple users', async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com' });
      await repository.create({ name: 'User 2', email: 'user2@example.com' });

      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('should return empty array initially', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return all created users', async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com' });
      await repository.create({ name: 'User 2', email: 'user2@example.com' });
      await repository.create({ name: 'User 3', email: 'user3@example.com' });

      const result = await repository.findAll();

      expect(result).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should return the user by id', async () => {
      const created = await repository.create({
        name: 'Find Me',
        email: 'find@example.com',
      });

      const result = await repository.findById(created.id);

      expect(result).toEqual(created);
    });

    it('should return null when user does not exist', async () => {
      const result = await repository.findById(99999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update name and return updated user', async () => {
      const created = await repository.create({
        name: 'Old Name',
        email: 'upd@example.com',
      });

      const result = await repository.update(created.id, { name: 'New Name' });

      expect(result).toHaveProperty('name', 'New Name');
      expect(result).toHaveProperty('email', 'upd@example.com');
    });

    it('should update email and return updated user', async () => {
      const created = await repository.create({
        name: 'Name',
        email: 'old@example.com',
      });

      const result = await repository.update(created.id, {
        email: 'new@example.com',
      });

      expect(result).toHaveProperty('email', 'new@example.com');
    });

    it('should return null when user does not exist', async () => {
      const result = await repository.update(99999, { name: 'Ghost' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should remove user from the list', async () => {
      const created = await repository.create({
        name: 'Delete Me',
        email: 'del@example.com',
      });

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should not throw when user does not exist', async () => {
      await expect(repository.delete(99999)).resolves.toBeUndefined();
    });
  });
});
