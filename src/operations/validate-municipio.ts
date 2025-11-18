/**
 * Validate Municipality Operation
 *
 * @description
 * Operation handler for municipality validation.
 *
 * @module operations/validate-municipio
 */

import { PostalCodeService } from '../services/postal-code-service';
import { Logger } from '../utils/logger';
import { LambdaEvent, LambdaResponse } from '../types';
import { InvalidCoordinatesError } from '../types/errors';

/**
 * Validate municipality operation
 *
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export async function validateMunicipioOperation(event: LambdaEvent): Promise<LambdaResponse> {
  Logger.info('ValidateMunicipioOperation', 'Processing request');

  const postalCodeService = new PostalCodeService();

  try {
    const result = await postalCodeService.validateMunicipio(event);

    Logger.info('ValidateMunicipioOperation', 'Validation successful', {
      municipio: result.value,
      valid: result.valid,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    Logger.error('ValidateMunicipioOperation', 'Validation failed', error);

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
