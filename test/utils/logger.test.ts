/**
 * Tests for Logger utility
 */

import { Logger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let originalEnv: string | undefined;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('debug', () => {
    it('should not log when LOG_LEVEL is not DEBUG', () => {
      delete process.env.LOG_LEVEL;
      Logger.debug('TestComponent', 'Debug message', { key: 'value' });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log when LOG_LEVEL is DEBUG', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      Logger.debug('TestComponent', 'Debug message', { key: 'value', ip: '192.168.1.1' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'DEBUG',
        component: 'TestComponent',
        message: 'Debug message',
        key: 'value',
        ip: '192.168.1.1', // In DEBUG mode, IP is not hashed
      });
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      Logger.info('TestComponent', 'Info message', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'INFO',
        component: 'TestComponent',
        message: 'Info message',
        key: 'value',
        timestamp: expect.any(String),
      });
    });

    it('should hash IP address in metadata', () => {
      Logger.info('TestComponent', 'Info message', { ip: '192.168.1.1' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.ip).toBeDefined();
      expect(logEntry.ip).not.toBe('192.168.1.1');
      expect(logEntry.ip).toMatch(/^[a-f0-9]{8}$/); // 8-char hex hash
    });

    it('should handle undefined metadata', () => {
      Logger.info('TestComponent', 'Info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'INFO',
        component: 'TestComponent',
        message: 'Info message',
      });
    });
  });

  describe('warn', () => {
    it('should log warn message', () => {
      Logger.warn('TestComponent', 'Warning message', { key: 'value' });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleWarnSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'WARN',
        component: 'TestComponent',
        message: 'Warning message',
        key: 'value',
        timestamp: expect.any(String),
      });
    });

    it('should hash IP address in metadata', () => {
      Logger.warn('TestComponent', 'Warning message', { ip: '10.0.0.1' });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleWarnSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.ip).toBeDefined();
      expect(logEntry.ip).not.toBe('10.0.0.1');
      expect(logEntry.ip).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('error', () => {
    it('should log error with Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      Logger.error('TestComponent', 'Error message', error, { key: 'value' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Error message',
        key: 'value',
        error: {
          message: 'Test error',
          stack: 'Error stack trace',
          name: 'Error',
        },
        timestamp: expect.any(String),
      });
    });

    it('should log error with string', () => {
      Logger.error('TestComponent', 'Error message', 'String error', { key: 'value' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Error message',
        key: 'value',
        error: {
          message: 'String error',
        },
      });
    });

    it('should log error with object', () => {
      const errorObj = { code: 500, message: 'Internal error' };
      Logger.error('TestComponent', 'Error message', errorObj);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.error.message).toBe(JSON.stringify(errorObj));
    });

    it('should log error without error parameter', () => {
      Logger.error('TestComponent', 'Error message', undefined, { key: 'value' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Error message',
        key: 'value',
      });
      expect(logEntry.error).toBeUndefined();
    });

    it('should hash IP address in metadata', () => {
      const error = new Error('Test error');
      Logger.error('TestComponent', 'Error message', error, { ip: '172.16.0.1' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.ip).toBeDefined();
      expect(logEntry.ip).not.toBe('172.16.0.1');
      expect(logEntry.ip).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle error without metadata', () => {
      const error = new Error('Test error');
      Logger.error('TestComponent', 'Error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Error message',
        error: {
          message: 'Test error',
        },
      });
    });
  });

  describe('IP hashing', () => {
    it('should return original IP in DEBUG mode', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      Logger.info('TestComponent', 'Message', { ip: '192.168.1.1' });
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.ip).toBe('192.168.1.1');
    });

    it('should hash IP in non-DEBUG mode', () => {
      delete process.env.LOG_LEVEL;
      Logger.info('TestComponent', 'Message', { ip: '192.168.1.1' });
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.ip).not.toBe('192.168.1.1');
      expect(logEntry.ip).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should not hash non-string IP values', () => {
      Logger.info('TestComponent', 'Message', { ip: 123 });
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.ip).toBe(123);
    });
  });

  describe('log output streams', () => {
    it('should use console.log for INFO', () => {
      Logger.info('TestComponent', 'Info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should use console.warn for WARN', () => {
      Logger.warn('TestComponent', 'Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should use console.error for ERROR', () => {
      Logger.error('TestComponent', 'Error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should use console.log for DEBUG', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      Logger.debug('TestComponent', 'Debug message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});

