import { User } from './users.model';

describe('User Model', () => {
  it('should be defined', () => {
    const user = new User();
    expect(user).toBeDefined();
  });

  it('should create user with properties', () => {
    const user = new User();
    user.id = 1;
    user.name = 'John Doe';
    user.email = 'john.doe@example.com';

    expect(user.id).toBe(1);
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john.doe@example.com');
  });

  it('should allow modification of properties', () => {
    const user = new User();

    user.id = 1;
    user.name = 'Initial Name';
    user.email = 'initial@example.com';

    user.name = 'Updated Name';
    user.email = 'updated@example.com';

    expect(user.id).toBe(1);
    expect(user.name).toBe('Updated Name');
    expect(user.email).toBe('updated@example.com');
  });

  it('should be usable as a plain domain object', () => {
    const user = new User();
    user.id = 123;
    user.name = 'Database User';
    user.email = 'db@example.com';

    expect(user).toBeInstanceOf(User);
    expect(typeof user.id).toBe('number');
    expect(typeof user.name).toBe('string');
    expect(typeof user.email).toBe('string');
  });

  it('should allow creating multiple instances with different data', () => {
    const user1 = new User();
    user1.id = 1;
    user1.name = 'User 1';
    user1.email = 'user1@example.com';

    const user2 = new User();
    user2.id = 2;
    user2.name = 'User 2';
    user2.email = 'user2@example.com';

    expect(user1).not.toBe(user2);
    expect(user1.id).not.toBe(user2.id);
    expect(user1.name).not.toBe(user2.name);
    expect(user1.email).not.toBe(user2.email);
  });

  it('should have public properties', () => {
    const user = new User();

    expect(() => {
      user.id = 1;
      user.name = 'Test';
      user.email = 'test@example.com';
    }).not.toThrow();

    expect(user.id).toBe(1);
    expect(user.name).toBe('Test');
    expect(user.email).toBe('test@example.com');
  });

  it('should work with object assignment', () => {
    const userData = {
      id: 456,
      name: 'Assigned User',
      email: 'assigned@example.com',
    };

    const user = Object.assign(new User(), userData);

    expect(user.id).toBe(userData.id);
    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
  });
});
