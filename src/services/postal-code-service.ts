/**
 * Postal Code Service
 *
 * @description
 * Service for Spanish postal code geocoding using static database.
 * Provides forward and reverse geocoding without external API dependencies.
 *
 * **Features:**
 * - Postal code → coordinates (O(1), <1ms)
 * - Municipality → coordinates (O(n), ~5ms)
 * - Coordinates → nearest postal code (Haversine, ~10-20ms)
 * - Unlimited requests (no rate limit)
 *
 * @module services/postal-code-service
 */

import { PostalCodeProvider } from '../providers/postal-code-provider';
import { Logger } from '../utils/logger';
import {
  GeocodingResult,
  ReverseGeocodingResult,
  LambdaEvent,
  AutocompleteResult,
  ValidationResult,
} from '../types';
import {
  InvalidCoordinatesError,
  PostalCodeNotFoundError,
} from '../types/errors';
import { COORDINATE_RANGES, POSTAL_CODE_REGEX } from '../types/constants';

/**
 * Postal Code Service
 *
 * @description
 * Service for Spanish postal code geocoding operations.
 * Uses static database of 11,150 Spanish postal codes.
 *
 * @class
 */
export class PostalCodeService {
  private readonly postalCodeProvider: PostalCodeProvider;

  constructor() {
    this.postalCodeProvider = new PostalCodeProvider();
  }

  /**
   * Validate coordinates
   *
   * @private
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @throws {InvalidCoordinatesError} If coordinates are invalid
   */
  private validateCoordinates(lat: number, lon: number): void {
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < COORDINATE_RANGES.MIN_LATITUDE ||
      lat > COORDINATE_RANGES.MAX_LATITUDE ||
      lon < COORDINATE_RANGES.MIN_LONGITUDE ||
      lon > COORDINATE_RANGES.MAX_LONGITUDE
    ) {
      throw new InvalidCoordinatesError('Invalid coordinates', lat, lon);
    }
  }

  /**
   * Geocode by postal code or municipality
   *
   * @description
   * Geocodes Spanish postal code or municipality name to coordinates.
   * Tries postal code first (faster), then municipality if not found.
   *
   * @param {LambdaEvent} event - Lambda event with body containing postalCode or municipio
   * @returns {Promise<GeocodingResult>} Geocoding result
   * @throws {PostalCodeNotFoundError} If neither postal code nor municipality found
   *
   * @example
   * ```typescript
   * const service = new PostalCodeService();
   * const result = await service.geocodeByPostal(event);
   * // Returns: { success: true, coords: { lat: 40.4168, lon: -3.7038 }, ... }
   * ```
   */
  async geocodeByPostal(event: LambdaEvent): Promise<GeocodingResult> {
    const { postalCode, municipio } = this.parseGeocodingInput(event);

    Logger.debug('PostalCodeService', 'Geocoding by postal', {
      postalCode: postalCode || 'N/A',
      municipio: municipio || 'N/A',
    });

    // Try postal code first (most precise, O(1))
    if (postalCode) {
      const result = await this.tryGeocodeByPostalCode(postalCode, municipio);
      if (result) {
        return result;
      }
    }

    // Try municipality (less precise, O(n))
    if (municipio) {
      return this.geocodeByMunicipio(municipio);
    }

    // Neither postal code nor municipio provided
    throw new PostalCodeNotFoundError();
  }

  /**
   * Parse and validate geocoding input from Lambda event
   *
   * @private
   * @param {LambdaEvent} event - Lambda event
   * @returns {{ postalCode?: string; municipio?: string }} Parsed input
   * @throws {InvalidCoordinatesError} If JSON parsing fails
   */
  private parseGeocodingInput(event: LambdaEvent): { postalCode?: string; municipio?: string } {
    let body: Record<string, unknown>;
    try {
      body = typeof event.body === 'string' 
        ? JSON.parse(event.body) as Record<string, unknown> 
        : (event.body || event) as Record<string, unknown>;
    } catch (error) {
      Logger.error('PostalCodeService', 'Failed to parse request body', error);
      throw new InvalidCoordinatesError('Invalid JSON in request body');
    }

    return {
      postalCode: typeof body.postalCode === 'string' ? body.postalCode : undefined,
      municipio: typeof body.municipio === 'string' ? body.municipio : undefined,
    };
  }

  /**
   * Try to geocode by postal code, with fallback to municipality
   *
   * @private
   * @param {string} postalCode - Postal code to geocode
   * @param {string} [municipio] - Optional municipality for fallback
   * @returns {Promise<GeocodingResult | null>} Result if successful, null to try municipality
   * @throws {InvalidCoordinatesError} If postal code format is invalid
   * @throws {PostalCodeNotFoundError} If postal code not found and no municipio fallback
   */
  private async tryGeocodeByPostalCode(
    postalCode: string,
    municipio?: string
  ): Promise<GeocodingResult | null> {
    // Validate postal code format
    if (!POSTAL_CODE_REGEX.test(postalCode)) {
      Logger.warn('PostalCodeService', 'Invalid postal code format', { postalCode });
      throw new InvalidCoordinatesError(
        `Invalid postal code format: ${postalCode}. Expected 5 digits.`
      );
    }

    try {
      const result = await this.postalCodeProvider.geocodeByPostalCode(postalCode);
      Logger.info('PostalCodeService', 'Geocoding successful by postal code', {
        postalCode,
        municipio: result.municipio,
        provincia: result.provincia,
      });
      return result;
    } catch (error) {
      if (error instanceof PostalCodeNotFoundError && municipio) {
        Logger.debug('PostalCodeService', 'Postal code not found, will try municipio', {
          postalCode,
          municipio,
        });
        return null; // Signal to try municipality
      }
      throw error;
    }
  }

  /**
   * Geocode by municipality name
   *
   * @private
   * @param {string} municipio - Municipality name
   * @returns {Promise<GeocodingResult>} Geocoding result
   * @throws {PostalCodeNotFoundError} If municipality not found
   */
  private async geocodeByMunicipio(municipio: string): Promise<GeocodingResult> {
    try {
      const result = await this.postalCodeProvider.geocodeByMunicipio(municipio);
      Logger.info('PostalCodeService', 'Geocoding successful by municipio', {
        municipio,
        postalCode: result.postalCode,
        provincia: result.provincia,
      });
      return result;
    } catch (error) {
      Logger.warn('PostalCodeService', 'Municipio not found', { municipio });
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to nearest postal code
   *
   * @description
   * Finds nearest Spanish postal code from GPS coordinates using Haversine distance.
   *
   * @param {LambdaEvent} event - Lambda event with body containing lat and lon
   * @returns {Promise<ReverseGeocodingResult>} Reverse geocoding result with distance
   * @throws {InvalidCoordinatesError} If coordinates are invalid
   * @throws {PostalCodeNotFoundError} If no postal code found (should never happen)
   *
   * @example
   * ```typescript
   * const service = new PostalCodeService();
   * const result = await service.reverseGeocode(event);
   * // Returns: { success: true, postalCode: '28001', distance: 0.5, ... }
   * ```
   */
  async reverseGeocode(event: LambdaEvent): Promise<ReverseGeocodingResult> {
    // Parse input with error handling
    let body: Record<string, unknown>;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) as Record<string, unknown> : event as Record<string, unknown>;
    } catch (error) {
      Logger.error('PostalCodeService', 'Failed to parse request body', error);
      throw new InvalidCoordinatesError('Invalid JSON in request body');
    }

    const latValue = body.lat;
    const lonValue = body.lon;

    // Validation
    if (!latValue || !lonValue) {
      throw new InvalidCoordinatesError('lat and lon are required');
    }

    // Safely convert to string, handling objects
    const latStr = typeof latValue === 'string' || typeof latValue === 'number' 
      ? String(latValue) 
      : JSON.stringify(latValue);
    const lonStr = typeof lonValue === 'string' || typeof lonValue === 'number' 
      ? String(lonValue) 
      : JSON.stringify(lonValue);
    const latitude = Number.parseFloat(latStr);
    const longitude = Number.parseFloat(lonStr);

    this.validateCoordinates(latitude, longitude);

    Logger.debug('PostalCodeService', 'Reverse geocoding', {
      lat: latitude,
      lon: longitude,
    });

    try {
      const result = await this.postalCodeProvider.reverseGeocode(latitude, longitude);

      Logger.info('PostalCodeService', 'Reverse geocoding successful', {
        lat: latitude,
        lon: longitude,
        postalCode: result.postalCode,
        municipio: result.municipio,
        distance: result.distance,
      });

      return {
        success: result.success,
        city: result.municipio,
        postalCode: result.postalCode,
        provincia: result.provincia,
        country: 'España',
        coords: result.coords,
        distance: result.distance,
      };
    } catch (error) {
      Logger.error('PostalCodeService', 'Reverse geocoding failed', error, {
        lat: latitude,
        lon: longitude,
      });
      throw error;
    }
  }

  /**
   * Validate postal code
   *
   * @description
   * Validates if a postal code exists in the database.
   * O(1) lookup - very fast validation.
   *
   * @param {LambdaEvent} event - Lambda event with body containing postalCode
   * @returns {Promise<ValidationResult>} Validation result
   * @throws {InvalidCoordinatesError} If input is invalid
   */
  async validatePostal(event: LambdaEvent): Promise<ValidationResult> {
    const { postalCode } = this.parseValidationInput(event, 'postalCode');

    Logger.debug('PostalCodeService', 'Validating postal code', { postalCode });

    const isValid = await this.postalCodeProvider.validatePostalCode(postalCode);

    Logger.info('PostalCodeService', 'Postal code validation result', {
      postalCode,
      valid: isValid,
    });

    return {
      valid: isValid,
      value: postalCode,
    };
  }

  /**
   * Validate municipality
   *
   * @description
   * Validates if a municipality exists in the database.
   * O(1) lookup - very fast validation.
   *
   * @param {LambdaEvent} event - Lambda event with body containing municipio
   * @returns {Promise<ValidationResult>} Validation result
   * @throws {InvalidCoordinatesError} If input is invalid
   */
  async validateMunicipio(event: LambdaEvent): Promise<ValidationResult> {
    const { municipio } = this.parseValidationInput(event, 'municipio');

    Logger.debug('PostalCodeService', 'Validating municipio', { municipio });

    const isValid = await this.postalCodeProvider.validateMunicipio(municipio);

    Logger.info('PostalCodeService', 'Municipio validation result', {
      municipio,
      valid: isValid,
    });

    return {
      valid: isValid,
      value: municipio,
    };
  }

  /**
   * Autocomplete postal code
   *
   * @description
   * Returns postal codes matching the given prefix.
   * Returns up to 'limit' results (default: 10, max: 50).
   *
   * @param {LambdaEvent} event - Lambda event with body containing prefix and optional limit
   * @returns {Promise<AutocompleteResult[]>} List of matching postal codes
   * @throws {InvalidCoordinatesError} If input is invalid
   */
  async autocompletePostal(event: LambdaEvent): Promise<AutocompleteResult[]> {
    const { prefix, limit } = this.parseAutocompleteInput(event);

    Logger.debug('PostalCodeService', 'Autocomplete postal code', { prefix, limit });

    const results = await this.postalCodeProvider.autocompletePostalCode(prefix!, limit);

    Logger.info('PostalCodeService', 'Autocomplete postal code results', {
      prefix,
      limit,
      resultsCount: results.length,
    });

    return results;
  }

  /**
   * Autocomplete municipality
   *
   * @description
   * Returns municipalities matching the given query.
   * Returns up to 'limit' results (default: 10, max: 50).
   *
   * @param {LambdaEvent} event - Lambda event with body containing query and optional limit
   * @returns {Promise<AutocompleteResult[]>} List of matching municipalities
   * @throws {InvalidCoordinatesError} If input is invalid
   */
  async autocompleteMunicipio(event: LambdaEvent): Promise<AutocompleteResult[]> {
    const { query, limit } = this.parseAutocompleteInput(event);

    Logger.debug('PostalCodeService', 'Autocomplete municipio', { query, limit });

    const results = await this.postalCodeProvider.autocompleteMunicipio(query!, limit);

    Logger.info('PostalCodeService', 'Autocomplete municipio results', {
      query,
      limit,
      resultsCount: results.length,
    });

    return results;
  }

  /**
   * Parse and validate validation input from Lambda event
   *
   * @private
   */
  private parseValidationInput(
    event: LambdaEvent,
    field: 'postalCode' | 'municipio'
  ): { postalCode: string; municipio: string } {
    let body: Record<string, unknown>;
    try {
      body = typeof event.body === 'string' 
        ? JSON.parse(event.body) as Record<string, unknown> 
        : (event.body || event) as Record<string, unknown>;
    } catch (error) {
      Logger.error('PostalCodeService', 'Failed to parse request body', error);
      throw new InvalidCoordinatesError('Invalid JSON in request body');
    }

    const value = body[field];

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new InvalidCoordinatesError(`${field} is required and must be a non-empty string`);
    }

    return { [field]: value } as { postalCode: string; municipio: string };
  }

  /**
   * Parse and validate autocomplete input from Lambda event
   *
   * @private
   */
  private parseAutocompleteInput(event: LambdaEvent): { 
    prefix?: string; 
    query?: string; 
    limit: number 
  } {
    let body: Record<string, unknown>;
    try {
      body = typeof event.body === 'string' 
        ? JSON.parse(event.body) as Record<string, unknown> 
        : (event.body || event) as Record<string, unknown>;
    } catch (error) {
      Logger.error('PostalCodeService', 'Failed to parse request body', error);
      throw new InvalidCoordinatesError('Invalid JSON in request body');
    }

    const prefix = body.prefix && typeof body.prefix === 'string' ? body.prefix : undefined;
    const query = body.query && typeof body.query === 'string' ? body.query : undefined;

    if (!prefix && !query) {
      throw new InvalidCoordinatesError('Either prefix or query is required');
    }

    const limitValue = body.limit;
    let limit = 10;

    if (limitValue !== undefined) {
      const parsedLimit = typeof limitValue === 'number' 
        ? limitValue 
        : Number.parseInt(String(limitValue), 10);

      if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
        throw new InvalidCoordinatesError('limit must be a positive number');
      }

      limit = Math.min(parsedLimit, 50);
    }

    return { prefix, query, limit };
  }
}

