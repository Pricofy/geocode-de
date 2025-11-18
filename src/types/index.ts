/**
 * Common Types for Spanish Geocoding Service
 *
 * @description
 * Centralized type definitions for Lambda handlers and postal code operations.
 *
 * @module types
 */

/**
 * Lambda event structure
 *
 * @description
 * Standard Lambda event format with headers, body, and request context.
 */
export interface LambdaEvent {
  /** Request body (stringified JSON or parsed object) */
  body?: string | Record<string, unknown>;
  /** HTTP headers */
  headers?: Record<string, string>;
  /** Request context */
  requestContext?: Record<string, unknown>;
}

/**
 * Lambda response structure
 *
 * @description
 * Standard Lambda response format with status code and body.
 */
export interface LambdaResponse {
  /** HTTP status code */
  statusCode: number;
  /** Response body (stringified JSON) */
  body: string;
}

/**
 * Postal code data structure
 *
 * @description
 * Structure for Spanish postal code database entries.
 */
export interface PostalData {
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Municipality name */
  municipio: string;
  /** Province name */
  provincia: string;
}

/**
 * Geocoding result structure
 *
 * @description
 * Result format for geocoding operations (postal code → coordinates).
 */
export interface GeocodingResult {
  /** Success flag */
  success: boolean;
  /** Geographic coordinates */
  coords: {
    /** Latitude */
    lat: number;
    /** Longitude */
    lon: number;
  };
  /** Municipality name */
  municipio: string;
  /** Province name */
  provincia: string;
  /** Postal code */
  postalCode: string;
  /** Source of the result (postal_code, municipio, or reverse_geocode) */
  source: 'postal_code' | 'municipio' | 'reverse_geocode';
}

/**
 * Reverse geocoding result structure
 *
 * @description
 * Result format for reverse geocoding operations (coordinates → postal code).
 */
export interface ReverseGeocodingResult {
  /** Success flag */
  success: boolean;
  /** City/municipality name */
  city: string;
  /** Postal code */
  postalCode: string;
  /** Province name */
  provincia: string;
  /** Country name (always "Spain" for this service) */
  country: string;
  /** Geographic coordinates */
  coords: {
    /** Latitude */
    lat: number;
    /** Longitude */
    lon: number;
  };
  /** Distance to nearest postal code in kilometers */
  distance: number;
}

/**
 * Autocomplete result structure
 *
 * @description
 * Result format for autocomplete operations (postal code or municipality).
 */
export interface AutocompleteResult {
  /** Postal code (5 digits) */
  postalCode: string;
  /** Municipality name */
  municipio: string;
  /** Province name */
  provincia: string;
}

/**
 * Validation result structure
 *
 * @description
 * Result format for validation operations.
 */
export interface ValidationResult {
  /** Valid flag */
  valid: boolean;
  /** Input value that was validated */
  value: string;
}

