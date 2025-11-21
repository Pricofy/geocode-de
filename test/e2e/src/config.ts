/**
 * E2E Test Configuration
 * 
 * Loads configuration from environment variables with sensible defaults.
 */

export interface TestConfig {
  awsRegion: string;
  lambdaFunctionName: string;
  testTimeout: number;
}

/**
 * Get test configuration from environment variables
 */
export function getConfig(): TestConfig {
  return {
    awsRegion: process.env.AWS_REGION || 'eu-west-1',
    lambdaFunctionName: process.env.LAMBDA_FUNCTION_NAME || 'pricofy-geocode-es',
    testTimeout: parseInt(process.env.TEST_TIMEOUT || '60000', 10),
  };
}

/**
 * Default test configuration
 */
export const config = getConfig();

