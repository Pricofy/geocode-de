/**
 * Tests for custom error classes
 */

import {
  LocationError,
  InvalidCoordinatesError,
  PostalCodeNotFoundError,
  ValidationError,
  getErrorMessage,
  isLocationError,
} from '../../src/types/errors';

describe('LocationError', () => {
  class TestLocationError extends LocationError {
    constructor(message: string, cause?: Error) {
      super(message, cause);
    }
  }

  it('should create error with message', () => {
    const error = new TestLocationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('TestLocationError');
    expect(error.timestamp).toBeDefined();
    expect(error.stack).toBeDefined();
  });

  it('should create error with cause', () => {
    const cause = new Error('Original error');
    const error = new TestLocationError('Test error', cause);
    expect(error.cause).toBe(cause);
  });

  it('should convert to JSON without cause', () => {
    const error = new TestLocationError('Test error');
    const json = error.toJSON();
    expect(json).toMatchObject({
      name: 'TestLocationError',
      message: 'Test error',
      timestamp: expect.any(String),
      stack: expect.any(String),
      cause: undefined,
    });
  });

  it('should convert to JSON with cause', () => {
    const cause = new Error('Original error');
    const error = new TestLocationError('Test error', cause);
    const json = error.toJSON();
    expect(json).toMatchObject({
      name: 'TestLocationError',
      message: 'Test error',
      timestamp: expect.any(String),
      stack: expect.any(String),
      cause: {
        message: 'Original error',
        stack: expect.any(String),
      },
    });
  });
});

describe('InvalidCoordinatesError', () => {
  it('should create error with message only', () => {
    const error = new InvalidCoordinatesError('Invalid coordinates');
    expect(error.message).toBe('Invalid coordinates');
    expect(error.lat).toBeUndefined();
    expect(error.lon).toBeUndefined();
  });

  it('should create error with lat and lon', () => {
    const error = new InvalidCoordinatesError('Invalid coordinates', 91, 181);
    expect(error.message).toBe('Invalid coordinates');
    expect(error.lat).toBe(91);
    expect(error.lon).toBe(181);
  });

  it('should convert to JSON with lat and lon', () => {
    const error = new InvalidCoordinatesError('Invalid coordinates', 91, 181);
    const json = error.toJSON();
    expect(json).toMatchObject({
      name: 'InvalidCoordinatesError',
      message: 'Invalid coordinates',
      lat: 91,
      lon: 181,
      timestamp: expect.any(String),
      stack: expect.any(String),
    });
  });
});

describe('PostalCodeNotFoundError', () => {
  it('should create error with postal code', () => {
    const error = new PostalCodeNotFoundError('99999');
    expect(error.message).toBe('Postal code not found: 99999');
    expect(error.postalCode).toBe('99999');
    expect(error.municipio).toBeUndefined();
  });

  it('should create error with municipio', () => {
    const error = new PostalCodeNotFoundError(undefined, 'UnknownCity');
    expect(error.message).toBe('Municipality not found: UnknownCity');
    expect(error.postalCode).toBeUndefined();
    expect(error.municipio).toBe('UnknownCity');
  });

  it('should create error with both', () => {
    const error = new PostalCodeNotFoundError('99999', 'UnknownCity');
    expect(error.message).toBe('Postal code not found: 99999');
    expect(error.postalCode).toBe('99999');
    expect(error.municipio).toBe('UnknownCity');
  });

  it('should create error with neither', () => {
    const error = new PostalCodeNotFoundError();
    expect(error.message).toBe('Postal code or municipality not found');
    expect(error.postalCode).toBeUndefined();
    expect(error.municipio).toBeUndefined();
  });

  it('should convert to JSON with postal code and municipio', () => {
    const error = new PostalCodeNotFoundError('99999', 'UnknownCity');
    const json = error.toJSON();
    expect(json).toMatchObject({
      name: 'PostalCodeNotFoundError',
      message: 'Postal code not found: 99999',
      postalCode: '99999',
      municipio: 'UnknownCity',
      timestamp: expect.any(String),
      stack: expect.any(String),
    });
  });
});

describe('ValidationError', () => {
  it('should create error with message only', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBeUndefined();
  });

  it('should create error with field', () => {
    const error = new ValidationError('Invalid input', 'postalCode');
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBe('postalCode');
  });

  it('should convert to JSON with field', () => {
    const error = new ValidationError('Invalid input', 'postalCode');
    const json = error.toJSON();
    expect(json).toMatchObject({
      name: 'ValidationError',
      message: 'Invalid input',
      field: 'postalCode',
      timestamp: expect.any(String),
      stack: expect.any(String),
    });
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('should convert string to string', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should convert number to string', () => {
    expect(getErrorMessage(123)).toBe('123');
  });

  it('should convert object to string', () => {
    expect(getErrorMessage({ code: 500 })).toBe('[object Object]');
  });

  it('should convert null to string', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('should convert undefined to string', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });
});

describe('isLocationError', () => {
  it('should return true for LocationError instance', () => {
    const error = new InvalidCoordinatesError('Invalid');
    expect(isLocationError(error)).toBe(true);
  });

  it('should return false for standard Error', () => {
    const error = new Error('Standard error');
    expect(isLocationError(error)).toBe(false);
  });

  it('should return false for string', () => {
    expect(isLocationError('String error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isLocationError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isLocationError(undefined)).toBe(false);
  });
});

