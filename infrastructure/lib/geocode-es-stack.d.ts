import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export interface GeocodeEsStackProps extends cdk.StackProps {
    environment: 'dev' | 'prod';
}
/**
 * Pricofy Geocode ES Stack
 *
 * Provides a single Lambda function for all Spanish postal code operations:
 * - geocode-by-postal
 * - reverse-geocode
 * - validate-postal
 * - validate-municipality
 * - autocomplete-postal
 * - autocomplete-municipality
 *
 * All operations are routed internally by the handler based on the 'operation' parameter.
 *
 * The function is PRIVATE (no Function URLs, no API Gateway).
 * Only invokable by pricofy-location-service via IAM role.
 *
 * Security:
 * - No public endpoints
 * - IAM-based invocation only
 * - Resource-Based Policies configured for pricofy-location-service
 * - Invoked by pricofy-location-service as orchestrator
 *
 * Note: Resource-Based Policies are configured via pricofy-infra stack
 * to avoid circular dependencies. This stack exports function ARN,
 * and pricofy-infra grants permissions to pricofy-location-service role.
 */
export declare class GeocodeEsStack extends cdk.Stack {
    readonly geocodeFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: GeocodeEsStackProps);
}
/**
 * Security Configuration Helper
 *
 * For pricofy-infra to grant invocation permissions:
 *
 * ```typescript
 * // In pricofy-infra stack:
 * import { Fn } from 'aws-cdk-lib';
 *
 * const geocodeEsArn = Fn.importValue(`Pricofy-GeocodeEsArn-${environment}`);
 *
 * // Grant pricofy-location-service role permission to invoke
 * locationServiceRole.addToPolicy(new iam.PolicyStatement({
 *   actions: ['lambda:InvokeFunction'],
 *   resources: [geocodeEsArn],
 * }));
 * ```
 *
 * This approach:
 * - Avoids circular dependencies (geocode-es doesn't need to know about location-service)
 * - Centralizes access control in pricofy-infra
 * - Follows AWS best practices for cross-stack references
 * - Allows principle of least privilege (only location-service role has access)
 */
