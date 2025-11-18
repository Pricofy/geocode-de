/**
 * Validate Postal Code Operation
 *
 * @description
 * Operation handler for postal code validation.
 *
 * @module operations/validate-postal
 */

import { PostalCodeService } from '../services/postal-code-service';
import { Logger } from '../utils/logger';
import { LambdaEvent, LambdaResponse } from '../types';
import { InvalidCoordinatesError } from '../types/errors';

/**
 * Validate postal code operation
 *
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export async function validatePostalOperation(event: LambdaEvent): Promise<LambdaResponse> {
  Logger.info('ValidatePostalOperation', 'Processing request');

  const postalCodeService = new PostalCodeService();

  try {
    const result = await postalCodeService.validatePostal(event);

    Logger.info('ValidatePostalOperation', 'Validation successful', {
      postalCode: result.value,
      valid: result.valid,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    Logger.error('ValidatePostalOperation', 'Validation failed', error);

    // Handle invalid input
    if (error instanceof InvalidCoordinatesError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          valid: false,
          error: error.message,
        }),
      };
    }

    // Handle other errors
    const isDev = process.env.ENVIRONMENT === 'dev';
    return {
      statusCode: 500,
      body: JSON.stringify({
        valid: false,
        error: 'Internal server error',
        details: isDev && error instanceof Error ? error.message : undefined,
      }),
    };
  }
}
