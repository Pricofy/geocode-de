/**
 * Autocomplete Postal Code Operation
 *
 * @description
 * Operation handler for postal code autocomplete.
 *
 * @module operations/autocomplete-postal
 */

import { PostalCodeService } from '../services/postal-code-service';
import { Logger } from '../utils/logger';
import { LambdaEvent, LambdaResponse } from '../types';
import { InvalidCoordinatesError } from '../types/errors';

/**
 * Autocomplete postal code operation
 *
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export async function autocompletePostalOperation(event: LambdaEvent): Promise<LambdaResponse> {
  Logger.info('AutocompletePostalOperation', 'Processing request');

  const postalCodeService = new PostalCodeService();

  try {
    const results = await postalCodeService.autocompletePostal(event);

    Logger.info('AutocompletePostalOperation', 'Autocomplete successful', {
      count: results.length,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        results,
        count: results.length,
      }),
    };
  } catch (error: unknown) {
    Logger.error('AutocompletePostalOperation', 'Autocomplete failed', error);

    // Handle invalid input
    if (error instanceof InvalidCoordinatesError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          results: [],
          count: 0,
          error: error.message,
        }),
      };
    }

    // Handle other errors
    const isDev = process.env.ENVIRONMENT === 'dev';
    return {
      statusCode: 500,
      body: JSON.stringify({
        results: [],
        count: 0,
        error: 'Internal server error',
        details: isDev && error instanceof Error ? error.message : undefined,
      }),
    };
  }
}
