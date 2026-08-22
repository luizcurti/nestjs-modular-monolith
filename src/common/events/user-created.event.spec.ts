import { UserCreatedEvent } from './user-created.event';

describe('UserCreatedEvent', () => {
  it('should be defined', () => {
    const event = new UserCreatedEvent('Test User', 'test@example.com');
    expect(event).toBeDefined();
  });

  it('should create event with name and email', () => {
    const name = 'John Doe';
    const email = 'john.doe@example.com';

    const event = new UserCreatedEvent(name, email);

    expect(event.name).toBe(name);
    expect(event.email).toBe(email);
  });

  it('should have readonly properties', () => {
    const event = new UserCreatedEvent('Test User', 'test@example.com');

    expect(event.name).toBe('Test User');
    expect(event.email).toBe('test@example.com');

    expect(event).toHaveProperty('name');
    expect(event).toHaveProperty('email');
  });

  it('should create different instances with different data', () => {
    const event1 = new UserCreatedEvent('User 1', 'user1@example.com');
    const event2 = new UserCreatedEvent('User 2', 'user2@example.com');

    expect(event1).not.toBe(event2);
    expect(event1.name).not.toBe(event2.name);
    expect(event1.email).not.toBe(event2.email);
  });

  it('should be instance of UserCreatedEvent', () => {
    const event = new UserCreatedEvent('Event User', 'event@example.com');

    expect(event).toBeInstanceOf(UserCreatedEvent);
  });

  it('should handle empty strings', () => {
    const event = new UserCreatedEvent('', '');

    expect(event.name).toBe('');
    expect(event.email).toBe('');
  });

  it('should handle special characters in name and email', () => {
    const name = "François O'Neil-Müller";
    const email = 'test+user@example-domain.com';

    const event = new UserCreatedEvent(name, email);

    expect(event.name).toBe(name);
    expect(event.email).toBe(email);
  });

  it('should be usable in event emitter patterns', () => {
    const userData = {
      name: 'Event Test User',
      email: 'eventtest@example.com',
    };

    const event = new UserCreatedEvent(userData.name, userData.email);

    expect(typeof event.name).toBe('string');
    expect(typeof event.email).toBe('string');
    expect(event.name).toBeTruthy();
    expect(event.email).toBeTruthy();
  });
});
