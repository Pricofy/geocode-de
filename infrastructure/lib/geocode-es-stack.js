"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeocodeEsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const path = __importStar(require("path"));
/**
 * Pricofy Geocode ES Stack
 *
 * Provides a single Lambda function for all Spanish postal code operations:
 * - geocode-by-postal
 * - reverse-geocode
 * - validate-postal
 * - validate-municipio
 * - autocomplete-postal
 * - autocomplete-municipio
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
class GeocodeEsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // ===========================================
        // Lambda: geocode (routing handler)
        // ===========================================
        // Create log group explicitly to avoid deprecated logRetention
        const logGroup = new logs.LogGroup(this, 'GeocodeLogGroup', {
            logGroupName: `/aws/lambda/pricofy-geocode-es-${props.environment}`,
            retention: logs.RetentionDays.ONE_MONTH, // GDPR compliance (30 days)
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        this.geocodeFunction = new lambda.Function(this, 'GeocodeFunction', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../dist')),
            handler: 'bootstrap', // Go Lambda entry point
            runtime: lambda.Runtime.PROVIDED_AL2023, // Go custom runtime (AL2023)
            timeout: cdk.Duration.seconds(10),
            memorySize: 128, // 128MB is sufficient for Go (more memory-efficient than Node.js)
            environment: {
                ENVIRONMENT: props.environment,
            },
            description: 'Spanish postal code geocoding operations (routing handler) - Go implementation',
            functionName: `pricofy-geocode-es-${props.environment}`,
            logGroup: logGroup,
            tracing: lambda.Tracing.ACTIVE, // X-Ray tracing for observability
        });
        // ===========================================
        // Exports (for pricofy-location-service to import)
        // ===========================================
        // Export function ARN for pricofy-location-service to configure permissions
        new cdk.CfnOutput(this, 'GeocodeEsArn', {
            value: this.geocodeFunction.functionArn,
            exportName: `Pricofy-GeocodeEsArn-${props.environment}`,
            description: 'ARN of geocode-es Lambda function',
        });
        new cdk.CfnOutput(this, 'GeocodeEsName', {
            value: this.geocodeFunction.functionName,
            exportName: `Pricofy-GeocodeEsName-${props.environment}`,
            description: 'Name of geocode-es Lambda function',
        });
        // ===========================================
        // Security Notice
        // ===========================================
        new cdk.CfnOutput(this, 'SecurityNotice', {
            value: 'Resource-Based Policies configured via pricofy-infra stack',
            description: 'Lambda function is private - only invokable by pricofy-location-service IAM role',
        });
        // ===========================================
        // Tags
        // ===========================================
        cdk.Tags.of(this).add('Project', 'Pricofy');
        cdk.Tags.of(this).add('Environment', props.environment);
        cdk.Tags.of(this).add('Component', 'Geocode-ES');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
    }
}
exports.GeocodeEsStack = GeocodeEsStack;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvY29kZS1lcy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlb2NvZGUtZXMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLCtEQUFpRDtBQUNqRCwyREFBNkM7QUFDN0MsMkNBQTZCO0FBTzdCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHO0FBQ0gsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4Q0FBOEM7UUFDOUMsb0NBQW9DO1FBQ3BDLDhDQUE4QztRQUU5QywrREFBK0Q7UUFDL0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUMxRCxZQUFZLEVBQUUsa0NBQWtDLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDbkUsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLDRCQUE0QjtZQUNyRSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNsRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSx3QkFBd0I7WUFDOUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLDZCQUE2QjtZQUN0RSxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHLEVBQUUsa0VBQWtFO1lBQ25GLFdBQVcsRUFBRTtnQkFDWCxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7YUFDL0I7WUFDRCxXQUFXLEVBQUUsZ0ZBQWdGO1lBQzdGLFlBQVksRUFBRSxzQkFBc0IsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN2RCxRQUFRLEVBQUUsUUFBUTtZQUNsQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsa0NBQWtDO1NBQ25FLENBQUMsQ0FBQztRQUVILDhDQUE4QztRQUM5QyxtREFBbUQ7UUFDbkQsOENBQThDO1FBRTlDLDRFQUE0RTtRQUM1RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ3ZDLFVBQVUsRUFBRSx3QkFBd0IsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN2RCxXQUFXLEVBQUUsbUNBQW1DO1NBQ2pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVk7WUFDeEMsVUFBVSxFQUFFLHlCQUF5QixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3hELFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLGtCQUFrQjtRQUNsQiw4Q0FBOEM7UUFFOUMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsNERBQTREO1lBQ25FLFdBQVcsRUFBRSxrRkFBa0Y7U0FDaEcsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLE9BQU87UUFDUCw4Q0FBOEM7UUFFOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN4RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBbkVELHdDQW1FQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXVCRyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBHZW9jb2RlRXNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogJ2RldicgfCAncHJvZCc7XG59XG5cbi8qKlxuICogUHJpY29meSBHZW9jb2RlIEVTIFN0YWNrXG4gKiBcbiAqIFByb3ZpZGVzIGEgc2luZ2xlIExhbWJkYSBmdW5jdGlvbiBmb3IgYWxsIFNwYW5pc2ggcG9zdGFsIGNvZGUgb3BlcmF0aW9uczpcbiAqIC0gZ2VvY29kZS1ieS1wb3N0YWxcbiAqIC0gcmV2ZXJzZS1nZW9jb2RlXG4gKiAtIHZhbGlkYXRlLXBvc3RhbFxuICogLSB2YWxpZGF0ZS1tdW5pY2lwaW9cbiAqIC0gYXV0b2NvbXBsZXRlLXBvc3RhbFxuICogLSBhdXRvY29tcGxldGUtbXVuaWNpcGlvXG4gKiBcbiAqIEFsbCBvcGVyYXRpb25zIGFyZSByb3V0ZWQgaW50ZXJuYWxseSBieSB0aGUgaGFuZGxlciBiYXNlZCBvbiB0aGUgJ29wZXJhdGlvbicgcGFyYW1ldGVyLlxuICogXG4gKiBUaGUgZnVuY3Rpb24gaXMgUFJJVkFURSAobm8gRnVuY3Rpb24gVVJMcywgbm8gQVBJIEdhdGV3YXkpLlxuICogT25seSBpbnZva2FibGUgYnkgcHJpY29meS1sb2NhdGlvbi1zZXJ2aWNlIHZpYSBJQU0gcm9sZS5cbiAqIFxuICogU2VjdXJpdHk6XG4gKiAtIE5vIHB1YmxpYyBlbmRwb2ludHNcbiAqIC0gSUFNLWJhc2VkIGludm9jYXRpb24gb25seVxuICogLSBSZXNvdXJjZS1CYXNlZCBQb2xpY2llcyBjb25maWd1cmVkIGZvciBwcmljb2Z5LWxvY2F0aW9uLXNlcnZpY2VcbiAqIC0gSW52b2tlZCBieSBwcmljb2Z5LWxvY2F0aW9uLXNlcnZpY2UgYXMgb3JjaGVzdHJhdG9yXG4gKiBcbiAqIE5vdGU6IFJlc291cmNlLUJhc2VkIFBvbGljaWVzIGFyZSBjb25maWd1cmVkIHZpYSBwcmljb2Z5LWluZnJhIHN0YWNrXG4gKiB0byBhdm9pZCBjaXJjdWxhciBkZXBlbmRlbmNpZXMuIFRoaXMgc3RhY2sgZXhwb3J0cyBmdW5jdGlvbiBBUk4sXG4gKiBhbmQgcHJpY29meS1pbmZyYSBncmFudHMgcGVybWlzc2lvbnMgdG8gcHJpY29meS1sb2NhdGlvbi1zZXJ2aWNlIHJvbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBHZW9jb2RlRXNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBnZW9jb2RlRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogR2VvY29kZUVzU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIExhbWJkYTogZ2VvY29kZSAocm91dGluZyBoYW5kbGVyKVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBcbiAgICAvLyBDcmVhdGUgbG9nIGdyb3VwIGV4cGxpY2l0bHkgdG8gYXZvaWQgZGVwcmVjYXRlZCBsb2dSZXRlbnRpb25cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdHZW9jb2RlTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS9wcmljb2Z5LWdlb2NvZGUtZXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILCAvLyBHRFBSIGNvbXBsaWFuY2UgKDMwIGRheXMpXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuZ2VvY29kZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2VvY29kZUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9kaXN0JykpLFxuICAgICAgaGFuZGxlcjogJ2Jvb3RzdHJhcCcsIC8vIEdvIExhbWJkYSBlbnRyeSBwb2ludFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFJPVklERURfQUwyMDIzLCAvLyBHbyBjdXN0b20gcnVudGltZSAoQUwyMDIzKVxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMTI4LCAvLyAxMjhNQiBpcyBzdWZmaWNpZW50IGZvciBHbyAobW9yZSBtZW1vcnktZWZmaWNpZW50IHRoYW4gTm9kZS5qcylcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIEVOVklST05NRU5UOiBwcm9wcy5lbnZpcm9ubWVudCxcbiAgICAgIH0sXG4gICAgICBkZXNjcmlwdGlvbjogJ1NwYW5pc2ggcG9zdGFsIGNvZGUgZ2VvY29kaW5nIG9wZXJhdGlvbnMgKHJvdXRpbmcgaGFuZGxlcikgLSBHbyBpbXBsZW1lbnRhdGlvbicsXG4gICAgICBmdW5jdGlvbk5hbWU6IGBwcmljb2Z5LWdlb2NvZGUtZXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgbG9nR3JvdXA6IGxvZ0dyb3VwLFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLCAvLyBYLVJheSB0cmFjaW5nIGZvciBvYnNlcnZhYmlsaXR5XG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gRXhwb3J0cyAoZm9yIHByaWNvZnktbG9jYXRpb24tc2VydmljZSB0byBpbXBvcnQpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIFxuICAgIC8vIEV4cG9ydCBmdW5jdGlvbiBBUk4gZm9yIHByaWNvZnktbG9jYXRpb24tc2VydmljZSB0byBjb25maWd1cmUgcGVybWlzc2lvbnNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR2VvY29kZUVzQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuZ2VvY29kZUZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxuICAgICAgZXhwb3J0TmFtZTogYFByaWNvZnktR2VvY29kZUVzQXJuLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIGdlb2NvZGUtZXMgTGFtYmRhIGZ1bmN0aW9uJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHZW9jb2RlRXNOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuZ2VvY29kZUZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcbiAgICAgIGV4cG9ydE5hbWU6IGBQcmljb2Z5LUdlb2NvZGVFc05hbWUtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIGdlb2NvZGUtZXMgTGFtYmRhIGZ1bmN0aW9uJyxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTZWN1cml0eSBOb3RpY2VcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NlY3VyaXR5Tm90aWNlJywge1xuICAgICAgdmFsdWU6ICdSZXNvdXJjZS1CYXNlZCBQb2xpY2llcyBjb25maWd1cmVkIHZpYSBwcmljb2Z5LWluZnJhIHN0YWNrJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIGZ1bmN0aW9uIGlzIHByaXZhdGUgLSBvbmx5IGludm9rYWJsZSBieSBwcmljb2Z5LWxvY2F0aW9uLXNlcnZpY2UgSUFNIHJvbGUnLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFRhZ3NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ1ByaWNvZnknKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgcHJvcHMuZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnQ29tcG9uZW50JywgJ0dlb2NvZGUtRVMnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcbiAgfVxufVxuXG4vKipcbiAqIFNlY3VyaXR5IENvbmZpZ3VyYXRpb24gSGVscGVyXG4gKiBcbiAqIEZvciBwcmljb2Z5LWluZnJhIHRvIGdyYW50IGludm9jYXRpb24gcGVybWlzc2lvbnM6XG4gKiBcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIHByaWNvZnktaW5mcmEgc3RhY2s6XG4gKiBpbXBvcnQgeyBGbiB9IGZyb20gJ2F3cy1jZGstbGliJztcbiAqIFxuICogY29uc3QgZ2VvY29kZUVzQXJuID0gRm4uaW1wb3J0VmFsdWUoYFByaWNvZnktR2VvY29kZUVzQXJuLSR7ZW52aXJvbm1lbnR9YCk7XG4gKiBcbiAqIC8vIEdyYW50IHByaWNvZnktbG9jYXRpb24tc2VydmljZSByb2xlIHBlcm1pc3Npb24gdG8gaW52b2tlXG4gKiBsb2NhdGlvblNlcnZpY2VSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAqICAgYWN0aW9uczogWydsYW1iZGE6SW52b2tlRnVuY3Rpb24nXSxcbiAqICAgcmVzb3VyY2VzOiBbZ2VvY29kZUVzQXJuXSxcbiAqIH0pKTtcbiAqIGBgYFxuICogXG4gKiBUaGlzIGFwcHJvYWNoOlxuICogLSBBdm9pZHMgY2lyY3VsYXIgZGVwZW5kZW5jaWVzIChnZW9jb2RlLWVzIGRvZXNuJ3QgbmVlZCB0byBrbm93IGFib3V0IGxvY2F0aW9uLXNlcnZpY2UpXG4gKiAtIENlbnRyYWxpemVzIGFjY2VzcyBjb250cm9sIGluIHByaWNvZnktaW5mcmFcbiAqIC0gRm9sbG93cyBBV1MgYmVzdCBwcmFjdGljZXMgZm9yIGNyb3NzLXN0YWNrIHJlZmVyZW5jZXNcbiAqIC0gQWxsb3dzIHByaW5jaXBsZSBvZiBsZWFzdCBwcml2aWxlZ2UgKG9ubHkgbG9jYXRpb24tc2VydmljZSByb2xlIGhhcyBhY2Nlc3MpXG4gKi9cblxuIl19