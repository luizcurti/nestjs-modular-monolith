import { UsersModule } from './users.module';

describe('UsersModule', () => {
  let usersModule: UsersModule;

  beforeEach(() => {
    usersModule = new UsersModule();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usersModule).toBeDefined();
  });

  it('should be an instance of UsersModule', () => {
    expect(usersModule).toBeInstanceOf(UsersModule);
  });

  it('should have correct module metadata', () => {
    const moduleMetadata = Reflect.getMetadata('imports', UsersModule);
    expect(moduleMetadata).toBeDefined();
    expect(Array.isArray(moduleMetadata)).toBe(true);
  });

  it('should have controllers defined in metadata', () => {
    const controllers = Reflect.getMetadata('controllers', UsersModule);
    expect(controllers).toBeDefined();
    expect(Array.isArray(controllers)).toBe(true);
  });

  it('should have providers defined in metadata', () => {
    const providers = Reflect.getMetadata('providers', UsersModule);
    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
  });
});
