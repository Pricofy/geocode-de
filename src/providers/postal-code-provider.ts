/**
 * Postal Code Provider
 *
 * @description
 * Provider for Spanish postal code geocoding using static database.
 * Provides unlimited, fast geocoding without external API dependencies.
 *
 * **Features:**
 * - Static database of 11,150 Spanish postal codes
 * - Unlimited requests (no rate limit)
 * - <1ms latency (O(1) lookup for postal code)
 * - ~5ms latency (O(n) search for municipality)
 * - No external API dependencies
 *
 * @module providers/postal-codes
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { Logger } from '../utils/logger';
import { PostalCodeNotFoundError } from '../types/errors';
import { PostalData, GeocodingResult } from '../types';

/**
 * Autocomplete result structure
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
 * Interface for postal code provider
 */
export interface IPostalCodeProvider {
  /**
   * Geocode postal code to coordinates
   *
   * @param {string} postalCode - Spanish postal code (5 digits)
   * @returns {Promise<GeocodingResult>} Geocoding result
   * @throws {PostalCodeNotFoundError} If postal code not found
   */
  geocodeByPostalCode(postalCode: string): Promise<GeocodingResult>;

  /**
   * Geocode municipality name to coordinates
   *
   * @param {string} municipio - Municipality name
   * @returns {Promise<GeocodingResult>} Geocoding result
   * @throws {PostalCodeNotFoundError} If municipality not found
   */
  geocodeByMunicipio(municipio: string): Promise<GeocodingResult>;

  /**
   * Find nearest postal code from coordinates
   *
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<GeocodingResult & { distance: number }>} Nearest postal code with distance
   * @throws {PostalCodeNotFoundError} If no postal code found
   */
  reverseGeocode(lat: number, lon: number): Promise<GeocodingResult & { distance: number }>;
}

/**
 * Postal Code Provider Implementation
 *
 * @description
 * Provider for Spanish postal code geocoding using static JSON database.
 * Database is loaded once and cached in memory for Lambda container reuse.
 *
 * @class
 * @implements {IPostalCodeProvider}
 */
export class PostalCodeProvider implements IPostalCodeProvider {
  private codes: Record<string, PostalData> | null = null;
  private municipioIndex: Map<string, Array<{ postalCode: string; data: PostalData }>> | null = null;
  private municipioSet: Set<string> | null = null;
  private sortedPostalCodes: string[] | null = null;

  /**
   * Load postal codes database and create indexes
   */
  private getCodes(): Record<string, PostalData> {
    if (!this.codes) {
      const jsonPath = path.join(__dirname, '../resources/postal-codes-es.json');
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(jsonContent) as Record<string, PostalData>;
      this.codes = parsed;

      // Build indexes for O(1) lookups
      this.buildIndexes(parsed);

      Logger.info('PostalCodeProvider', 'Loaded postal codes database with indexes', {
        totalPostalCodes: Object.keys(parsed).length,
        uniqueMunicipios: this.municipioSet?.size || 0,
        path: jsonPath,
      });
    }
    return this.codes;
  }

  /**
   * Build optimized indexes for fast lookups
   */
  private buildIndexes(codes: Record<string, PostalData>): void {
    this.municipioIndex = new Map();
    this.municipioSet = new Set();

    for (const [postalCode, data] of Object.entries(codes)) {
      const municipioKey = data.municipio.toLowerCase().trim();

      this.municipioSet.add(municipioKey);

      if (!this.municipioIndex.has(municipioKey)) {
        this.municipioIndex.set(municipioKey, []);
      }
      this.municipioIndex.get(municipioKey)!.push({ postalCode, data });
    }

    this.sortedPostalCodes = Object.keys(codes).sort();

    Logger.debug('PostalCodeProvider', 'Built indexes', {
      municipioIndexSize: this.municipioIndex.size,
      municipioSetSize: this.municipioSet.size,
      sortedPostalCodesLength: this.sortedPostalCodes.length,
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   *
   * @description
   * Calculates great-circle distance between two points on Earth.
   * Returns distance in kilometers.
   *
   * @private
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in kilometers

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Geocode postal code to coordinates
   *
   * @description
   * Looks up postal code in database and returns coordinates.
   * O(1) lookup - very fast (<1ms).
   *
   * @param {string} postalCode - Spanish postal code (5 digits)
   * @returns {Promise<GeocodingResult>} Geocoding result
   * @throws {PostalCodeNotFoundError} If postal code not found
   *
   * @example
   * ```typescript
   * const provider = new PostalCodeProvider();
   * const result = await provider.geocodeByPostalCode('28001');
   * // Returns: { success: true, coords: { lat: 40.4168, lon: -3.7038 }, ... }
   * ```
   */
  async geocodeByPostalCode(postalCode: string): Promise<GeocodingResult> {
    Logger.debug('PostalCodeProvider', 'Geocoding by postal code', { postalCode });

    const codes = this.getCodes();

    if (!codes[postalCode]) {
      Logger.warn('PostalCodeProvider', 'Postal code not found', { postalCode });
      throw new PostalCodeNotFoundError(postalCode);
    }

    const data = codes[postalCode];

    Logger.info('PostalCodeProvider', 'Geocoding successful', {
      postalCode,
      municipio: data.municipio,
      provincia: data.provincia,
      lat: data.lat,
      lon: data.lon,
      source: 'postal_code',
    });

    return {
      success: true,
      coords: { lat: data.lat, lon: data.lon },
      municipio: data.municipio,
      provincia: data.provincia,
      postalCode,
      source: 'postal_code',
    };
  }

  /**
   * Geocode municipality name to coordinates
   *
   * @description
   * Uses municipio index for O(1) lookup.
   * Returns first postal code for the municipality.
   *
   * @param {string} municipio - Municipality name
   * @returns {Promise<GeocodingResult>} Geocoding result
   * @throws {PostalCodeNotFoundError} If municipality not found
   *
   * @example
   * ```typescript
   * const provider = new PostalCodeProvider();
   * const result = await provider.geocodeByMunicipio('Madrid');
   * // Returns: { success: true, coords: { lat: 40.4168, lon: -3.7038 }, ... }
   * ```
   */
  async geocodeByMunicipio(municipio: string): Promise<GeocodingResult> {
    Logger.debug('PostalCodeProvider', 'Geocoding by municipio', { municipio });

    const codes = this.getCodes();
    const municipioLower = municipio.toLowerCase().trim();

    // O(n) search through all postal codes
    for (const [postalCode, data] of Object.entries(codes)) {
      if (data.municipio.toLowerCase() === municipioLower) {
        Logger.info('PostalCodeProvider', 'Geocoding successful', {
          municipio,
          postalCode,
          provincia: data.provincia,
          lat: data.lat,
          lon: data.lon,
          source: 'municipio',
        });

        return {
          success: true,
          coords: { lat: data.lat, lon: data.lon },
          municipio: data.municipio,
          provincia: data.provincia,
          postalCode,
          source: 'municipio',
        };
      }
    }

    Logger.warn('PostalCodeProvider', 'Municipality not found', { municipio });
    throw new PostalCodeNotFoundError(undefined, municipio);
  }

  /**
   * Find nearest postal code from coordinates
   *
   * @description
   * Uses Haversine formula to find nearest postal code from GPS coordinates.
   * Brute force search through all 11K postal codes (~10-20ms).
   *
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<GeocodingResult & { distance: number }>} Nearest postal code with distance
   * @throws {PostalCodeNotFoundError} If no postal code found (should never happen)
   *
   * @example
   * ```typescript
   * const provider = new PostalCodeProvider();
   * const result = await provider.reverseGeocode(40.4168, -3.7038);
   * // Returns: { success: true, postalCode: '28001', distance: 0.5, ... }
   * ```
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult & { distance: number }> {
    Logger.debug('PostalCodeProvider', 'Reverse geocoding', { lat, lon });

    const codes = this.getCodes();

    // Find nearest postal code (brute force)
    const startTime = Date.now();
    let nearest: { postalCode: string; data: PostalData; distance: number } | null = null;
    let minDistance = Infinity;

    for (const [postalCode, data] of Object.entries(codes)) {
      const dist = this.calculateDistance(lat, lon, data.lat, data.lon);

      if (dist < minDistance) {
        minDistance = dist;
        nearest = {
          postalCode,
          data,
          distance: dist,
        };
      }
    }

    const elapsed = Date.now() - startTime;

    if (!nearest) {
      Logger.error('PostalCodeProvider', 'No postal code found (should never happen)');
      throw new PostalCodeNotFoundError();
    }

    Logger.info('PostalCodeProvider', 'Reverse geocoding successful', {
      lat,
      lon,
      postalCode: nearest.postalCode,
      municipio: nearest.data.municipio,
      provincia: nearest.data.provincia,
      distance: minDistance,
      elapsedMs: elapsed,
    });

    return {
      success: true,
      coords: { lat: nearest.data.lat, lon: nearest.data.lon },
      municipio: nearest.data.municipio,
      provincia: nearest.data.provincia,
      postalCode: nearest.postalCode,
      source: 'reverse_geocode',
      distance: Math.round(minDistance * 1000) / 1000, // km with 3 decimals
    };
  }

  /**
   * Validate if postal code exists
   *
   * @description
   * O(1) lookup in postal codes map.
   * Very fast validation (<1ms).
   *
   * @param {string} postalCode - Spanish postal code (5 digits)
   * @returns {Promise<boolean>} True if postal code exists
   *
   * @example
   * ```typescript
   * const provider = new PostalCodeProvider();
   * const exists = await provider.validatePostalCode('28001');
   * // Returns: true
   * ```
   */
  async validatePostalCode(postalCode: string): Promise<boolean> {
    Logger.debug('PostalCodeProvider', 'Validating postal code', { postalCode });

    const codes = this.getCodes();
    const exists = postalCode in codes;

    Logger.debug('PostalCodeProvider', 'Postal code validation result', {
      postalCode,
      exists,
    });

    return exists;
  }

  /**
   * Validate if municipality exists
   */
  async validateMunicipio(municipio: string): Promise<boolean> {
    Logger.debug('PostalCodeProvider', 'Validating municipio', { municipio });

    this.getCodes();
    const municipioLower = municipio.toLowerCase().trim();
    const exists = this.municipioSet!.has(municipioLower);

    Logger.debug('PostalCodeProvider', 'Municipio validation result', {
      municipio,
      exists,
    });

    return exists;
  }

  /**
   * Autocomplete postal codes
   */
  async autocompletePostalCode(prefix: string, limit: number = 10): Promise<AutocompleteResult[]> {
    Logger.debug('PostalCodeProvider', 'Autocomplete postal code', { prefix, limit });

    const codes = this.getCodes();
    const results: AutocompleteResult[] = [];

    const startIndex = this.sortedPostalCodes!.findIndex((code) => code.startsWith(prefix));

    if (startIndex === -1) {
      Logger.debug('PostalCodeProvider', 'No postal codes found for prefix', { prefix });
      return results;
    }

    for (
      let i = startIndex;
      i < this.sortedPostalCodes!.length && results.length < limit;
      i++
    ) {
      const postalCode = this.sortedPostalCodes![i];

      if (!postalCode.startsWith(prefix)) {
        break;
      }

      const data = codes[postalCode];
      results.push({
        postalCode,
        municipio: data.municipio,
        provincia: data.provincia,
      });
    }

    Logger.info('PostalCodeProvider', 'Autocomplete postal code results', {
      prefix,
      limit,
      resultsCount: results.length,
    });

    return results;
  }

  /**
   * Autocomplete municipalities
   */
  async autocompleteMunicipio(query: string, limit: number = 10): Promise<AutocompleteResult[]> {
    Logger.debug('PostalCodeProvider', 'Autocomplete municipio', { query, limit });

    this.getCodes();
    const queryLower = query.toLowerCase().trim();
    const results: AutocompleteResult[] = [];
    const seenMunicipios = new Set<string>();

    for (const [municipioKey, entries] of this.municipioIndex!.entries()) {
      if (results.length >= limit) {
        break;
      }

      if (municipioKey.startsWith(queryLower) || municipioKey.includes(queryLower)) {
        if (!seenMunicipios.has(municipioKey)) {
          seenMunicipios.add(municipioKey);
          const { postalCode, data } = entries[0];
          results.push({
            postalCode,
            municipio: data.municipio,
            provincia: data.provincia,
          });
        }
      }
    }

    results.sort((a, b) => {
      const aLower = a.municipio.toLowerCase();
      const bLower = b.municipio.toLowerCase();
      const aStarts = aLower.startsWith(queryLower);
      const bStarts = bLower.startsWith(queryLower);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return aLower.localeCompare(bLower);
    });

    Logger.info('PostalCodeProvider', 'Autocomplete municipio results', {
      query,
      limit,
      resultsCount: results.length,
    });

    return results.slice(0, limit);
  }
}

