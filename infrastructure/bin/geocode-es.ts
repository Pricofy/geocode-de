#!/usr/bin/env node
/**
 * Pricofy Geocode ES - CDK App Entry Point
 *
 * Defines Lambda function for Spanish postal code geocoding operations.
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GeocodeEsStack } from '../lib/geocode-es-stack';

const app = new cdk.App();

// Get environment from context (defaults to 'dev')
// Support both 'env' and 'environment' for backwards compatibility
const environment = app.node.tryGetContext('env') || app.node.tryGetContext('environment') || 'dev';

// Validate environment
if (!['dev', 'prod'].includes(environment)) {
  throw new Error(`Invalid environment: ${environment}. Must be 'dev' or 'prod'.`);
}

// Common props
const stackProps: cdk.StackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-1',
  },
  tags: {
    Project: "Pricofy",
    Service: "Geocode-ES",
    Environment: environment,
  },
};

// Geocode ES Stack: Lambda function for Spanish postal code operations
new GeocodeEsStack(app, `PricofyGeocodeEsStack`, {
  ...stackProps,
  description: `Pricofy Geocode ES (${environment}) - Spanish postal code geocoding Lambda function`,
  environment,
});

console.log(`✅ Stack name: PricofyGeocodeEsStack`);

app.synth();

