/**
 * Geocode Handler (Routing)
 *
 * @description
 * Single Lambda handler that routes to different operations based on the 'operation' parameter.
 * Supports all Spanish postal code operations:
 * - geocode-by-postal
 * - reverse-geocode
 * - validate-postal
 * - validate-municipio
 * - autocomplete-postal
 * - autocomplete-municipio
 *
 * @module handlers/geocode
 */

import { LambdaEvent, LambdaResponse } from '../types';
import { InvalidCoordinatesError } from '../types/errors';
import { Logger } from '../utils/logger';
import { geocodeByPostalOperation } from '../operations/geocode-by-postal';
import { reverseGeocodeOperation } from '../operations/reverse-geocode';
import { validatePostalOperation } from '../operations/validate-postal';
import { validateMunicipioOperation } from '../operations/validate-municipio';
import { autocompletePostalOperation } from '../operations/autocomplete-postal';
import { autocompleteMunicipioOperation } from '../operations/autocomplete-municipio';

/**
 * Lambda handler for geocode operations
 *
 * @description
 * Routes requests to appropriate operation based on 'operation' parameter in body.
 *
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  Logger.info('GeocodeHandler', 'Processing request');

  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = typeof event.body === 'string' 
        ? JSON.parse(event.body) as Record<string, unknown> 
        : (event.body || event) as Record<string, unknown>;
    } catch (error) {
      Logger.error('GeocodeHandler', 'Failed to parse request body', error);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
      };
    }

    const operation = body.operation;

    if (!operation || typeof operation !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Operation parameter is required',
        }),
      };
    }

    // Route to appropriate operation
    switch (operation) {
      case 'geocode-by-postal':
        return geocodeByPostalOperation(event);
      
      case 'reverse-geocode':
        return reverseGeocodeOperation(event);
      
      case 'validate-postal':
        return validatePostalOperation(event);
      
      case 'validate-municipio':
        return validateMunicipioOperation(event);
      
      case 'autocomplete-postal':
        return autocompletePostalOperation(event);
      
      case 'autocomplete-municipio':
        return autocompleteMunicipioOperation(event);
      
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: `Operation '${operation}' not supported. Supported operations: geocode-by-postal, reverse-geocode, validate-postal, validate-municipio, autocomplete-postal, autocomplete-municipio`,
          }),
        };
    }
  } catch (error: unknown) {
    Logger.error('GeocodeHandler', 'Handler failed', error);

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
