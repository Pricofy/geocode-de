/**
 * Custom Error Classes for Spanish Geocoding Service
 *
 * @description
 * Provides typed error classes for better error handling and debugging.
 * Preserves stack traces and error context.
 *
 * **Error Hierarchy:**
 * - LocationError (base class)
 *   - InvalidCoordinatesError (invalid lat/lon)
 *   - PostalCodeNotFoundError (postal code not in database)
 *   - ValidationError (invalid input format)
 *
 * @module types/errors
 */

/**
 * Base error class for geocoding service errors
 *
 * @description
 * All geocoding service errors extend this class.
 * Provides consistent error structure with timestamps and stack traces.
 *
 * @abstract
 * @class
 */
export abstract class LocationError extends Error {
  /**
   * ISO timestamp when the error occurred
   */
  public readonly timestamp: string;

  /**
   * Creates a new LocationError
   *
   * @param {string} message - Error message
   * @param {Error} [cause] - Original error that caused this error (optional)
   */
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts error to JSON for logging
   *
   * @returns {object} JSON representation of error
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause
        ? {
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }
}

/**
 * Error thrown when coordinates are invalid
 *
 * @description
 * Used when:
 * - Latitude out of range (-90 to 90)
 * - Longitude out of range (-180 to 180)
 * - Coordinates are NaN or null
 * - Invalid coordinate format
 *
 * @class
 * @extends {LocationError}
 */
export class InvalidCoordinatesError extends LocationError {
  /**
   * Creates a new InvalidCoordinatesError
   *
   * @param {string} message - Error message
   * @param {number} [lat] - Invalid latitude (optional)
   * @param {number} [lon] - Invalid longitude (optional)
   */
  constructor(message: string, public readonly lat?: number, public readonly lon?: number) {
    super(message);
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      lat: this.lat,
      lon: this.lon,
    };
  }
}

/**
 * Error thrown when postal code is not found in database
 *
 * @description
 * Used when:
 * - Postal code not in Spanish postal codes database
 * - Municipality name not found
 * - Search returns no results
 *
 * @class
 * @extends {LocationError}
 */
export class PostalCodeNotFoundError extends LocationError {
  /**
   * Creates a new PostalCodeNotFoundError
   *
   * @param {string} postalCode - Postal code that was not found (optional)
   * @param {string} [municipio] - Municipality name that was not found (optional)
   */
  constructor(public readonly postalCode?: string, public readonly municipio?: string) {
    let message: string;
    if (postalCode) {
      message = `Postal code not found: ${postalCode}`;
    } else if (municipio) {
      message = `Municipality not found: ${municipio}`;
    } else {
      message = 'Postal code or municipality not found';
    }
    super(message);
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      postalCode: this.postalCode,
      municipio: this.municipio,
    };
  }
}

/**
 * Error thrown when input validation fails
 *
 * @description
 * Used when:
 * - Invalid postal code format
 * - Invalid municipality name format
 * - Missing required parameters
 * - Malformed JSON in request body
 *
 * @class
 * @extends {LocationError}
 */
export class ValidationError extends LocationError {
  /**
   * Creates a new ValidationError
   *
   * @param {string} message - Error message
   * @param {string} [field] - Field name that failed validation (optional)
   */
  constructor(message: string, public readonly field?: string) {
    super(message);
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * Utility to safely extract error message from unknown error
 *
 * @param {unknown} error - Error object (any type)
 * @returns {string} Error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Utility to check if error is a geocoding service error
 *
 * @param {unknown} error - Error object (any type)
 * @returns {boolean} True if error is LocationError instance
 */
export function isLocationError(error: unknown): error is LocationError {
  return error instanceof LocationError;
}

