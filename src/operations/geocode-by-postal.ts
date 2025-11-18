/**
 * Geocode by Postal Code Operation
 *
 * @description
 * Operation handler for geocoding Spanish postal codes.
 *
 * @module operations/geocode-by-postal
 */

import { PostalCodeService } from '../services/postal-code-service';
import { Logger } from '../utils/logger';
import { LambdaEvent, LambdaResponse } from '../types';
import {
  PostalCodeNotFoundError,
  InvalidCoordinatesError,
} from '../types/errors';

/**
 * Geocode by postal code operation
 *
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export async function geocodeByPostalOperation(event: LambdaEvent): Promise<LambdaResponse> {
  Logger.info('GeocodeByPostalOperation', 'Processing request');

  const postalCodeService = new PostalCodeService();

  try {
    const result = await postalCodeService.geocodeByPostal(event);

    Logger.info('GeocodeByPostalOperation', 'Geocoding successful', {
      postalCode: result.postalCode,
      municipio: result.municipio,
      provincia: result.provincia,
      source: result.source,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    Logger.error('GeocodeByPostalOperation', 'Geocoding failed', error);

    // Handle not found
    if (error instanceof PostalCodeNotFoundError) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Postal code or municipio not found',
          hint:
            'Please provide a valid Spanish postal code (e.g., "28001") or municipality name (e.g., "Madrid")',
        }),
      };
    }

    // Handle invalid input
    if (error instanceof InvalidCoordinatesError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: error.message,
        }),
      };
    }

    // Handle other errors
    const isDev = process.env.ENVIRONMENT === 'dev';
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: isDev && error instanceof Error ? error.message : undefined,
      }),
    };
  }
}
