/**
 * Reverse Geocode Operation
 *
 * @description
 * Operation handler for reverse geocoding (GPS coordinates → postal code).
 *
 * @module operations/reverse-geocode
 */

import { PostalCodeService } from '../services/postal-code-service';
import { Logger } from '../utils/logger';
import { LambdaEvent, LambdaResponse } from '../types';
import {
  InvalidCoordinatesError,
  PostalCodeNotFoundError,
} from '../types/errors';

/**
 * Reverse geocode operation
 *
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export async function reverseGeocodeOperation(event: LambdaEvent): Promise<LambdaResponse> {
  Logger.info('ReverseGeocodeOperation', 'Processing request');

  const postalCodeService = new PostalCodeService();

  try {
    const result = await postalCodeService.reverseGeocode(event);

    Logger.info('ReverseGeocodeOperation', 'Reverse geocoding successful', {
      postalCode: result.postalCode,
      municipio: result.city,
      provincia: result.provincia,
      distance: result.distance,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    Logger.error('ReverseGeocodeOperation', 'Reverse geocoding failed', error);

    // Handle invalid coordinates
    if (error instanceof InvalidCoordinatesError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: error.message,
        }),
      };
    }

    // Handle not found (should never happen, but handle gracefully)
    if (error instanceof PostalCodeNotFoundError) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'No postal code found',
        }),
      };
    }

    // Handle other errors
    const isDev = process.env.ENVIRONMENT === 'dev';
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Reverse geocoding failed',
        details: isDev && error instanceof Error ? error.message : undefined,
      }),
    };
  }
}
