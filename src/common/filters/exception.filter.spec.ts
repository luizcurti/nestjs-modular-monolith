import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockHttpArgumentsHost: any;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockRequest = {
      url: '/test-url',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHttpArgumentsHost = {
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch HttpException and return correct status', () => {
    const httpException = new HttpException(
      'Test error',
      HttpStatus.BAD_REQUEST,
    );
    const mockTimestamp = '2023-01-01T00:00:00.000Z';
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

    filter.catch(httpException, mockArgumentsHost);

    expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
    expect(mockHttpArgumentsHost.getResponse).toHaveBeenCalled();
    expect(mockHttpArgumentsHost.getRequest).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Test error',
      timestamp: mockTimestamp,
      path: '/test-url',
    });
  });

  it('should catch unknown exception and return INTERNAL_SERVER_ERROR status', () => {
    const unknownException = new Error('Unknown error');
    const mockTimestamp = '2023-01-01T00:00:00.000Z';
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

    filter.catch(unknownException, mockArgumentsHost);

    expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: mockTimestamp,
      path: '/test-url',
    });
  });

  it('should handle different HTTP status codes', () => {
    const notFoundException = new HttpException(
      'Not found',
      HttpStatus.NOT_FOUND,
    );
    const mockTimestamp = '2023-01-01T00:00:00.000Z';
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

    filter.catch(notFoundException, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Not found',
      timestamp: mockTimestamp,
      path: '/test-url',
    });
  });

  describe('GraphQL execution context', () => {
    beforeEach(() => {
      mockArgumentsHost.getType.mockReturnValue('graphql');
    });

    it('returns the original HttpException instead of touching the HTTP response', () => {
      const notFoundException = new HttpException(
        'User with id 99 not found',
        HttpStatus.NOT_FOUND,
      );

      const result = filter.catch(notFoundException, mockArgumentsHost);

      expect(result).toBe(notFoundException);
      expect(mockArgumentsHost.switchToHttp).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('wraps unknown errors into a generic internal server error', () => {
      const result = filter.catch(new Error('boom'), mockArgumentsHost);

      expect(result).toBeInstanceOf(HttpException);
      expect((result as HttpException).getStatus()).toBe(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
