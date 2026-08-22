import { User, UserSchema } from './user.schema';

describe('User (Mongoose schema)', () => {
  it('should be defined', () => {
    const user = new User();
    expect(user).toBeDefined();
  });

  it('should hold name and email', () => {
    const user = Object.assign(new User(), {
      name: 'John Doe',
      email: 'john.doe@example.com',
    });

    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john.doe@example.com');
  });

  it('should expose a compiled Mongoose schema', () => {
    expect(UserSchema).toBeDefined();
    expect(UserSchema.path('name')).toBeDefined();
    expect(UserSchema.path('email')).toBeDefined();
  });
});
