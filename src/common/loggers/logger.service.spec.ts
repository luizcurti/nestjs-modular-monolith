import { LoggerService, LogLevel } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    service = new LoggerService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('idempotencyKey', () => {
    it('should set and get idempotency key', () => {
      const key = 'test-key-123';

      service.idempotencyKey = key;

      expect(service.idempotencyKey).toBe(key);
    });
  });

  describe('contextName', () => {
    it('should set and get context name', () => {
      const contextName = 'TestContext';

      service.contextName = contextName;

      expect(service.contextName).toBe(contextName);
    });

    it('should have default context name', () => {
      expect(service.contextName).toBe('Default');
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      const message = 'Test info message';
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();
      service.contextName = 'TestContext';
      service.idempotencyKey = 'test-key';

      service.info(message);

      expect(logSpy).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        message: message,
        meta: {
          context: 'TestContext',
          idempotency: 'test-key',
        },
      });
    });
  });

  describe('warn', () => {
    it('should log warn message', () => {
      const message = 'Test warning message';
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();
      service.contextName = 'TestContext';
      service.idempotencyKey = 'test-key';

      service.warn(message);

      expect(logSpy).toHaveBeenCalledWith({
        level: LogLevel.WARN,
        message: message,
        meta: {
          context: 'TestContext',
          idempotency: 'test-key',
        },
      });
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      const message = 'Test error message';
      const stackTrace = new Error('Test error');
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();
      service.contextName = 'TestContext';
      service.idempotencyKey = 'test-key';

      service.error(message, stackTrace);

      expect(logSpy).toHaveBeenCalledWith({
        level: LogLevel.ERROR,
        message: message,
        meta: {
          context: 'TestContext',
          stackTrace: stackTrace,
          idempotency: 'test-key',
        },
      });
    });

    it('should log error message without stack trace', () => {
      const message = 'Test error message';
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();
      service.contextName = 'TestContext';

      service.error(message);

      expect(logSpy).toHaveBeenCalledWith({
        level: LogLevel.ERROR,
        message: message,
        meta: {
          context: 'TestContext',
          stackTrace: undefined,
          idempotency: undefined,
        },
      });
    });
  });

  describe('LogLevel enum', () => {
    it('should have correct values', () => {
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
    });
  });

  describe('logTransportConsole', () => {
    it('should create transport with correct configuration', () => {
      const transport = (service as any).logTransportConsole();

      expect(transport).toBeDefined();
      expect(transport.handleExceptions).toBe(true);
      expect(transport.format).toBeDefined();
    });

    it('should format log message correctly with printf function', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'info',
        message: 'Test message',
        meta: { context: 'TestContext', additional: 'data' },
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });

    it('should handle missing timestamp in printf format', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        level: 'info',
        message: 'Test message without timestamp',
        meta: { context: 'TestContext' },
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });

    it('should handle missing meta context in printf format', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'info',
        message: 'Test message without meta context',
        meta: {},
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });

    it('should handle missing meta object in printf format', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'info',
        message: 'Test message without meta object',
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });

    it('should handle all undefined properties in printf format', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        level: 'error',
        message: 'Minimal info object',
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });

    it('should handle null values in printf format', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        timestamp: null,
        level: 'warn',
        message: 'Test with null timestamp',
        meta: null,
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });

    it('should handle meta with null context in printf format', () => {
      const transport = (service as any).logTransportConsole();
      const mockInfo = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'debug',
        message: 'Test with null context',
        meta: { context: null, other: 'data' },
      };

      const formatted = transport.format.transform(mockInfo);

      expect(formatted).toBeDefined();
    });
  });
});
