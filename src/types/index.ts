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

/**
 * Geocode postal code to coordinates
 * 
 * Converts Spanish postal code to geographic coordinates.
 * Uses static database of 11,150 Spanish postal codes.
 * 
 * @operation geocode-by-postal
 * 
 * @example Lambda Invoke (TypeScript)
 * ```typescript
 * import { Lambda, InvokeCommand } from '@aws-sdk/client-lambda';
 * 
 * const lambda = new Lambda({ region: 'eu-west-1' });
 * const response = await lambda.send(new InvokeCommand({
 *   FunctionName: 'pricofy-geocode-es',
 *   Payload: JSON.stringify({
 *     operation: 'geocode-by-postal',
 *     postalCode: '28001'
 *   })
 * }));
 * ```
 */
export interface GeocodeByPostalRequest {
  /**
   * Operation identifier - must be 'geocode-by-postal'
   * @required
   */
  operation: 'geocode-by-postal';
  /**
   * Postal code (5 digits)
   * @required
   * @example "28001"
   */
  postalCode: string;
}

/**
 * Reverse geocode coordinates to postal code
 * 
 * Finds nearest Spanish postal code from GPS coordinates.
 * 
 * @operation reverse-geocode
 * 
 * @example Lambda Invoke (TypeScript)
 * ```typescript
 * const response = await lambda.send(new InvokeCommand({
 *   FunctionName: 'pricofy-geocode-es',
 *   Payload: JSON.stringify({
 *     operation: 'reverse-geocode',
 *     lat: 40.4168,
 *     lon: -3.7038
 *   })
 * }));
 * ```
 */
export interface ReverseGeocodeRequest {
  /**
   * Operation identifier - must be 'reverse-geocode'
   * @required
   */
  operation: 'reverse-geocode';
  /**
   * Latitude (-90 to 90)
   * @required
   * @example 40.4168
   */
  lat: number;
  /**
   * Longitude (-180 to 180)
   * @required
   * @example -3.7038
   */
  lon: number;
}

/**
 * Validate postal code
 * 
 * Checks if Spanish postal code exists in the database.
 * 
 * @operation validate-postal
 * 
 * @example Lambda Invoke (TypeScript)
 * ```typescript
 * const response = await lambda.send(new InvokeCommand({
 *   FunctionName: 'pricofy-geocode-es',
 *   Payload: JSON.stringify({
 *     operation: 'validate-postal',
 *     postalCode: '28001'
 *   })
 * }));
 * ```
 */
export interface ValidatePostalRequest {
  /**
   * Operation identifier - must be 'validate-postal'
   * @required
   */
  operation: 'validate-postal';
  /**
   * Postal code to validate (5 digits)
   * @required
   * @example "28001"
   */
  postalCode: string;
}

/**
 * Validate municipality
 * 
 * Checks if Spanish municipality exists in the database.
 * 
 * @operation validate-municipio
 * 
 * @example Lambda Invoke (TypeScript)
 * ```typescript
 * const response = await lambda.send(new InvokeCommand({
 *   FunctionName: 'pricofy-geocode-es',
 *   Payload: JSON.stringify({
 *     operation: 'validate-municipio',
 *     municipio: 'Madrid'
 *   })
 * }));
 * ```
 */
export interface ValidateMunicipioRequest {
  /**
   * Operation identifier - must be 'validate-municipio'
   * @required
   */
  operation: 'validate-municipio';
  /**
   * Municipality name to validate
   * @required
   * @example "Madrid"
   */
  municipio: string;
}

/**
 * Autocomplete postal code
 * 
 * Searches Spanish postal codes by prefix.
 * 
 * @operation autocomplete-postal
 * 
 * @example Lambda Invoke (TypeScript)
 * ```typescript
 * const response = await lambda.send(new InvokeCommand({
 *   FunctionName: 'pricofy-geocode-es',
 *   Payload: JSON.stringify({
 *     operation: 'autocomplete-postal',
 *     prefix: '280',
 *     limit: 5
 *   })
 * }));
 * ```
 */
export interface AutocompletePostalRequest {
  /**
   * Operation identifier - must be 'autocomplete-postal'
   * @required
   */
  operation: 'autocomplete-postal';
  /**
   * Postal code prefix to autocomplete
   * @required
   * @example "280"
   */
  prefix: string;
  /**
   * Maximum number of results
   * @default 10
   * @example 5
   */
  limit?: number;
}

/**
 * Autocomplete municipality
 * 
 * Searches Spanish municipalities by query (fuzzy search).
 * 
 * @operation autocomplete-municipio
 * 
 * @example Lambda Invoke (TypeScript)
 * ```typescript
 * const response = await lambda.send(new InvokeCommand({
 *   FunctionName: 'pricofy-geocode-es',
 *   Payload: JSON.stringify({
 *     operation: 'autocomplete-municipio',
 *     query: 'mad',
 *     limit: 5
 *   })
 * }));
 * ```
 */
export interface AutocompleteMunicipioRequest {
  /**
   * Operation identifier - must be 'autocomplete-municipio'
   * @required
   */
  operation: 'autocomplete-municipio';
  /**
   * Municipality name query (fuzzy search)
   * @required
   * @example "mad"
   */
  query: string;
  /**
   * Maximum number of results
   * @default 10
   * @example 5
   */
  limit?: number;
}

