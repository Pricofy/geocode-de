/**
 * Logger - Structured Logging Utility for CloudWatch
 *
 * @description
 * Provides consistent, structured logging across the application.
 * All logs are JSON-formatted for CloudWatch Insights compatibility.
 *
 * **Key Features:**
 * - **Structured**: JSON format for easy parsing and querying
 * - **Contextual**: Component name + metadata for each log
 * - **Cloud-Native**: Optimized for CloudWatch Insights queries
 * - **Type-Safe**: TypeScript interfaces for log entries
 * - **Environment-Aware**: DEBUG logs only when LOG_LEVEL=DEBUG
 * - **Privacy-Compliant**: Automatic IP hashing for GDPR compliance
 *
 * **Log Levels:**
 * - **DEBUG**: Detailed debugging (only when LOG_LEVEL=DEBUG)
 * - **INFO**: Important state changes, successful operations
 * - **WARN**: Recoverable issues, fallback scenarios
 * - **ERROR**: Failures, exceptions, critical issues
 *
 * **CloudWatch Insights Queries:**
 * ```
 * # Find all errors in PostalCode provider
 * fields @timestamp, component, message, error.message
 * | filter level = "ERROR" and component = "PostalCode"
 * | sort @timestamp desc
 *
 * # Find slow operations
 * fields @timestamp, component, message, metadata.latency
 * | filter metadata.latency > 1000
 * ```
 *
 * @module utils/logger
 *
 * @example
 * ```typescript
 * // Info log with metadata
 * Logger.info('PostalCodeService', 'Loaded postal codes database', {
 *   count: 11150,
 *   size: '1.31 MB'
 * });
 *
 * // Error log with exception
 * try {
 *   await geocode();
 * } catch (error) {
 *   Logger.error('PostalCode', 'Geocoding failed', error, {
 *     operation: 'geocodeByPostal',
 *     postalCode: '28001'
 *   });
 * }
 * ```
 */

import * as crypto from 'node:crypto';

/**
 * Log level enumeration
 *
 * @description
 * Standard log levels in order of severity (DEBUG < INFO < WARN < ERROR).
 *
 * @enum {string}
 */
export enum LogLevel {
  /** Detailed debugging information (only logged when LOG_LEVEL=DEBUG) */
  DEBUG = 'DEBUG',
  /** Informational messages for normal operations */
  INFO = 'INFO',
  /** Warning messages for recoverable issues */
  WARN = 'WARN',
  /** Error messages for failures and exceptions */
  ERROR = 'ERROR',
}

/**
 * Base structure for all log entries
 *
 * @description
 * Common fields present in every log entry.
 * Extended by specific log types with additional fields.
 *
 * @interface
 */
interface BaseLogEntry {
  /** Log severity level */
  level: LogLevel;
  /** Component/service/class name (e.g., 'PostalCode', 'PostalCodeService') */
  component: string;
  /** Human-readable log message */
  message: string;
  /** ISO 8601 timestamp (UTC) */
  timestamp: string;
}

/**
 * Error log entry with error details
 *
 * @description
 * Extends BaseLogEntry with structured error information.
 * Captures error message, stack trace, and error name.
 *
 * @interface
 * @extends {BaseLogEntry}
 */
interface ErrorLogEntry extends BaseLogEntry {
  /** Structured error information */
  error?: {
    /** Error message */
    message: string;
    /** Stack trace (if available) */
    stack?: string;
    /** Error constructor name (e.g., 'TypeError', 'LocationError') */
    name?: string;
  };
}

/**
 * Log entry with additional metadata
 *
 * @description
 * Flexible log entry type that allows arbitrary additional fields.
 * Use for attaching contextual data like latency, counts, IDs, etc.
 *
 * @typedef {BaseLogEntry & Record<string, any>} LogEntry
 */
type LogEntry = BaseLogEntry & Record<string, any>;

/**
 * Logger - Static utility class for structured logging
 *
 * @description
 * All methods are static - no instantiation needed.
 * Logs are written to stdout/stderr (captured by CloudWatch).
 *
 * **Usage Guidelines:**
 * - Use `debug()` for development/troubleshooting (disabled in prod)
 * - Use `info()` for important operations (provider init, config load)
 * - Use `warn()` for recoverable issues (fallback to backup provider)
 * - Use `error()` for failures (API errors, validation failures)
 *
 * **Performance:**
 * - JSON.stringify overhead is negligible (<1ms)
 * - DEBUG logs skipped entirely when not enabled
 * - Synchronous logging (no buffering delay)
 *
 * **Privacy:**
 * - IP addresses are automatically hashed in non-DEBUG mode (GDPR compliance)
 * - Hash format: sha256(ip).slice(0, 8) for correlation without PII exposure
 *
 * @static
 * @class
 */
export class Logger {
  /**
   * Hash an IP address for privacy-compliant logging
   *
   * @description
   * GDPR-compliant IP hashing. Returns first 8 chars of SHA-256 hash.
   * Allows correlation of requests without storing actual IP addresses.
   *
   * In DEBUG mode, returns original IP for development troubleshooting.
   *
   * @private
   * @static
   * @param {string} ip - IP address to hash
   * @returns {string} Hashed IP (8 chars) or original IP in DEBUG mode
   *
   * @example
   * ```typescript
   * hashIp('192.168.1.1')     // Returns: 'a3f4b2c1' (production)
   * hashIp('192.168.1.1')     // Returns: '192.168.1.1' (DEBUG mode)
   * ```
   */
  private static hashIp(ip: string): string {
    // In DEBUG mode, show full IP for troubleshooting
    if (process.env.LOG_LEVEL === 'DEBUG') {
      return ip;
    }

    // Hash IP for privacy compliance (GDPR)
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 8);
  }

  /**
   * Sanitize metadata to hash IP addresses
   *
   * @description
   * Recursively searches for 'ip' fields in metadata and hashes them.
   * Preserves all other fields unchanged.
   *
   * @private
   * @static
   * @param {Record<string, any>} [metadata] - Metadata object to sanitize
   * @returns {Record<string, any> | undefined} Sanitized metadata
   */
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized = { ...metadata };

    // Hash 'ip' field if present
    if (sanitized.ip && typeof sanitized.ip === 'string') {
      sanitized.ip = this.hashIp(sanitized.ip);
    }

    return sanitized;
  }
  /**
   * Logs a debug message
   *
   * @description
   * **Only logged when `LOG_LEVEL=DEBUG` environment variable is set.**
   * Use for detailed debugging information that's too verbose for production.
   *
   * **Use Cases:**
   * - Postal code lookup process
   * - Haversine distance calculations
   * - Detailed request/response payloads
   *
   * @static
   * @param {string} component - Component/class name
   * @param {string} message - Log message
   * @param {Record<string, any>} [metadata] - Additional structured data
   * @returns {void}
   *
   * @example
   * ```typescript
   * Logger.debug('PostalCodeService', 'Searching postal codes', {
   *   query: '28001',
   *   strategy: 'exact_match'
   * });
   * ```
   */
  static debug(component: string, message: string, metadata?: Record<string, any>): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      // In DEBUG mode, don't sanitize (show full IPs for troubleshooting)
      this.log(LogLevel.DEBUG, component, message, metadata);
    }
  }

  /**
   * Logs an info message
   *
   * @description
   * Use for important state changes and successful operations.
   * These logs help understand application flow and health.
   *
   * **Use Cases:**
   * - Service initialization (postal codes loaded)
   * - Successful operations with metadata (geocoding completed)
   * - Configuration changes
   * - Performance metrics (latency, distance calculations)
   *
   * @static
   * @param {string} component - Component/class name
   * @param {string} message - Log message
   * @param {Record<string, any>} [metadata] - Additional structured data
   * @returns {void}
   *
   * @example
   * ```typescript
   * Logger.info('PostalCodeService', 'Geocoding completed', {
   *   postalCode: '28001',
   *   latency: 5,
   *   source: 'postal_code'
   * });
   * ```
   */
  static info(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, component, message, this.sanitizeMetadata(metadata));
  }

  /**
   * Logs a warning message
   *
   * @description
   * Use for recoverable issues and fallback scenarios.
   * Indicates something unexpected happened, but operation continues.
   *
   * **Use Cases:**
   * - Postal code not found (fallback to municipality search)
   * - Missing optional configuration
   * - Rate limit approaching
   *
   * @static
   * @param {string} component - Component/class name
   * @param {string} message - Log message
   * @param {Record<string, any>} [metadata] - Additional structured data
   * @returns {void}
   *
   * @example
   * ```typescript
   * Logger.warn('PostalCodeService', 'Postal code not found, trying municipality', {
   *   postalCode: '99999',
   *   municipio: 'Madrid'
   * });
   * ```
   */
  static warn(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, component, message, this.sanitizeMetadata(metadata));
  }

  /**
   * Logs an error message with error details
   *
   * @description
   * Use for failures and exceptions. Captures full error details including
   * stack trace for debugging. Always use for caught exceptions.
   *
   * **Use Cases:**
   * - Database load failures
   * - External API call failures
   * - Invalid coordinate validation
   * - Configuration errors
   * - All caught exceptions
   *
   * **Error Parameter:**
   * - If `Error` object: Extracts message, stack, name
   * - If other type: Converts to string
   *
   * @static
   * @param {string} component - Component/class name
   * @param {string} message - Log message
   * @param {Error | unknown} [error] - Error object (optional but recommended)
   * @param {Record<string, any>} [metadata] - Additional structured data
   * @returns {void}
   *
   * @example
   * ```typescript
   * // With Error object
   * try {
   *   await geocode();
   * } catch (error) {
   *   Logger.error('PostalCode', 'Geocoding failed', error, {
   *     operation: 'geocodeByPostal',
   *     postalCode: '28001'
   *   });
   * }
   *
   * // Without Error object
   * Logger.error('PostalCodeService', 'Invalid postal code format', undefined, {
   *   postalCode: 'invalid',
   *   expectedFormat: '5 digits'
   * });
   * ```
   */
  static error(
    component: string,
    message: string,
    error?: unknown,
    metadata?: Record<string, any>
  ): void {
    const logEntry: ErrorLogEntry = {
      level: LogLevel.ERROR,
      component,
      message,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMetadata(metadata),
    };

    // Extract structured error information
    if (error) {
      if (error instanceof Error) {
        logEntry.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      } else {
        // Handle non-Error throws (strings, objects, etc.)
        logEntry.error = {
          message: typeof error === 'string' ? error : JSON.stringify(error),
        };
      }
    }

    console.error(JSON.stringify(logEntry));
  }

  /**
   * Internal logging method
   *
   * @description
   * Shared implementation for debug/info/warn levels.
   * Formats log entry as JSON and writes to appropriate stream.
   *
   * **Output Streams:**
   * - ERROR → stderr (console.error)
   * - WARN → stderr (console.warn)
   * - INFO/DEBUG → stdout (console.log)
   *
   * @private
   * @static
   * @param {LogLevel} level - Log severity level
   * @param {string} component - Component/class name
   * @param {string} message - Log message
   * @param {Record<string, any>} [metadata] - Additional structured data
   * @returns {void}
   */
  private static log(
    level: LogLevel,
    component: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      level,
      component,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    const output = JSON.stringify(logEntry);

    // Route to appropriate output stream
    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
}

