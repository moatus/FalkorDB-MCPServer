import { redisService } from './redis.service';
import { AppError, CommonErrors } from '../errors/AppError.js';

// Mock the logger service
jest.mock('./logger.service.js', () => ({
  logger: {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined),
  }
}));

// Mock the config
jest.mock('../config/index.js', () => ({
  config: {
    redis: {
      url: 'redis://localhost:6379',
      username: 'testuser',
      password: 'testpass'
    }
  }
}));

// Mock the Redis library
jest.mock('redis', () => {
  const mockConnect = jest.fn();
  const mockPing = jest.fn();
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockQuit = jest.fn();
  
  const mockClient = {
    connect: mockConnect,
    ping: mockPing,
    get: mockGet,
    set: mockSet,
    quit: mockQuit
  };
  
  return {
    createClient: jest.fn().mockReturnValue(mockClient),
    mockConnect,
    mockPing,
    mockGet,
    mockSet,
    mockQuit,
    mockClient
  };
});

describe('Redis Service', () => {
  let mockRedis: any;
  
  beforeAll(async () => {
    // Access the mocks
    mockRedis = await import('redis');
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    (redisService as any).client = null;
    (redisService as any).retryCount = 0;
    (redisService as any).isInitializing = false;
  });

  describe('initialize', () => {
    it('should successfully initialize and connect to Redis', async () => {
      // Arrange
      mockRedis.mockConnect.mockResolvedValue(undefined);
      mockRedis.mockPing.mockResolvedValue('PONG');

      // Act
      await redisService.initialize();

      // Assert
      expect(mockRedis.createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        username: 'testuser',
        password: 'testpass',
      });
      expect(mockRedis.mockConnect).toHaveBeenCalled();
      expect(mockRedis.mockPing).toHaveBeenCalled();
      expect((redisService as any).client).not.toBeNull();
      expect((redisService as any).retryCount).toBe(0);
      expect((redisService as any).isInitializing).toBe(false);
    });

    it('should not initialize if already initializing', async () => {
      // Arrange
      (redisService as any).isInitializing = true;

      // Act
      await redisService.initialize();

      // Assert
      expect(mockRedis.createClient).not.toHaveBeenCalled();
    });

    it('should retry connection on failure and eventually succeed', async () => {
      // Arrange
      const connectError = new Error('Connection failed');
      mockRedis.mockConnect
        .mockRejectedValueOnce(connectError)
        .mockRejectedValueOnce(connectError)
        .mockResolvedValueOnce(undefined);
      mockRedis.mockPing.mockResolvedValue('PONG');

      // Mock setTimeout to avoid actual delays
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        setImmediate(callback);
        return {} as any;
      });

      // Act
      await redisService.initialize();

      // Assert
      expect(mockRedis.createClient).toHaveBeenCalledTimes(3);
      expect((redisService as any).client).not.toBeNull();
      expect((redisService as any).retryCount).toBe(0);

      // Cleanup
      setTimeoutSpy.mockRestore();
    });

    it('should throw AppError after max retries exceeded', async () => {
      // Arrange
      const connectError = new Error('Connection failed');
      mockRedis.mockConnect.mockRejectedValue(connectError);

      // Mock setTimeout to avoid actual delays
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        setImmediate(callback);
        return {} as any;
      });

      // Act & Assert
      try {
        await redisService.initialize();
        fail('Expected initialize to throw AppError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe(CommonErrors.CONNECTION_FAILED);
      }
      
      expect(mockRedis.createClient).toHaveBeenCalledTimes(6); // 1 initial + 5 retries

      // Cleanup
      setTimeoutSpy.mockRestore();
    });

    it('should handle ping failure during connection test', async () => {
      // Arrange
      const pingError = new Error('Ping failed');
      mockRedis.mockConnect.mockResolvedValue(undefined);
      mockRedis.mockPing.mockRejectedValue(pingError);

      // Mock setTimeout to avoid actual delays
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        setImmediate(callback);
        return {} as any;
      });

      // Act & Assert
      await expect(redisService.initialize()).rejects.toThrow(AppError);

      // Cleanup
      setTimeoutSpy.mockRestore();
    });
  });
  
  describe('get', () => {
    it('should get a value from Redis', async () => {
      // Arrange
      const key = 'testKey';
      const expectedValue = 'testValue';
      
      mockRedis.mockGet.mockResolvedValue(expectedValue);
      
      // Force client to be available
      (redisService as any).client = mockRedis.mockClient;
      
      // Act
      const result = await redisService.get(key);
      
      // Assert
      expect(mockRedis.mockGet).toHaveBeenCalledWith(key);
      expect(result).toBe(expectedValue);
    });

    it('should return null when key does not exist', async () => {
      // Arrange
      const key = 'nonExistentKey';
      
      mockRedis.mockGet.mockResolvedValue(null);
      
      // Force client to be available
      (redisService as any).client = mockRedis.mockClient;
      
      // Act
      const result = await redisService.get(key);
      
      // Assert
      expect(mockRedis.mockGet).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });
    
    it('should throw AppError if client is not initialized', async () => {
      // Arrange
      (redisService as any).client = null;
      
      // Act & Assert
      await expect(redisService.get('testKey'))
        .rejects
        .toThrow(AppError);
      await expect(redisService.get('testKey'))
        .rejects
        .toThrow('Redis client not initialized');
    });

    it('should throw AppError when get operation fails', async () => {
      // Arrange
      const key = 'testKey';
      const getError = new Error('Redis GET failed');
      
      mockRedis.mockGet.mockRejectedValue(getError);
      
      // Force client to be available
      (redisService as any).client = mockRedis.mockClient;
      
      // Act & Assert
      try {
        await redisService.get(key);
        fail('Expected get to throw AppError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe(CommonErrors.OPERATION_FAILED);
      }
    });
  });
  
  describe('set', () => {
    it('should set a value in Redis', async () => {
      // Arrange
      const key = 'testKey';
      const value = 'testValue';
      
      mockRedis.mockSet.mockResolvedValue('OK');
      
      // Force client to be available
      (redisService as any).client = mockRedis.mockClient;
      
      // Act
      await redisService.set(key, value);
      
      // Assert
      expect(mockRedis.mockSet).toHaveBeenCalledWith(key, value);
    });
    
    it('should throw AppError if client is not initialized', async () => {
      // Arrange
      (redisService as any).client = null;
      
      // Act & Assert
      await expect(redisService.set('testKey', 'testValue'))
        .rejects
        .toThrow(AppError);
      await expect(redisService.set('testKey', 'testValue'))
        .rejects
        .toThrow('Redis client not initialized');
    });

    it('should throw AppError when set operation fails', async () => {
      // Arrange
      const key = 'testKey';
      const value = 'testValue';
      const setError = new Error('Redis SET failed');
      
      mockRedis.mockSet.mockRejectedValue(setError);
      
      // Force client to be available
      (redisService as any).client = mockRedis.mockClient;
      
      // Act & Assert
      try {
        await redisService.set(key, value);
        fail('Expected set to throw AppError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe(CommonErrors.OPERATION_FAILED);
      }
    });
  });
  
  describe('close', () => {
    it('should close the client connection successfully', async () => {
      // Arrange
      mockRedis.mockQuit.mockResolvedValue('OK');
      (redisService as any).client = mockRedis.mockClient;
      (redisService as any).retryCount = 3;
      
      // Act
      await redisService.close();
      
      // Assert
      expect(mockRedis.mockQuit).toHaveBeenCalled();
      expect((redisService as any).client).toBeNull();
      expect((redisService as any).retryCount).toBe(0);
    });

    it('should handle close error gracefully', async () => {
      // Arrange
      const closeError = new Error('Close failed');
      mockRedis.mockQuit.mockRejectedValue(closeError);
      (redisService as any).client = mockRedis.mockClient;
      (redisService as any).retryCount = 2;
      
      // Act
      await redisService.close();
      
      // Assert
      expect(mockRedis.mockQuit).toHaveBeenCalled();
      expect((redisService as any).client).toBeNull();
      expect((redisService as any).retryCount).toBe(0);
    });
    
    it('should not throw if client is already null', async () => {
      // Arrange
      (redisService as any).client = null;
      
      // Act & Assert
      await expect(redisService.close()).resolves.not.toThrow();
      expect(mockRedis.mockQuit).not.toHaveBeenCalled();
    });
  });
});