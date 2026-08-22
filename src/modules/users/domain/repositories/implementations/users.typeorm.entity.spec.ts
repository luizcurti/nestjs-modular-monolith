import { UserOrmEntity } from './users.typeorm.entity';

describe('UserOrmEntity', () => {
  it('should be defined', () => {
    const entity = new UserOrmEntity();
    expect(entity).toBeDefined();
  });

  it('should hold id, name and email', () => {
    const entity = Object.assign(new UserOrmEntity(), {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
    });

    expect(entity.id).toBe(1);
    expect(entity.name).toBe('John Doe');
    expect(entity.email).toBe('john.doe@example.com');
  });
});
