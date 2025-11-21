#!/usr/bin/env node
"use strict";
/**
 * Pricofy Geocode ES - CDK App Entry Point
 *
 * Defines Lambda function for Spanish postal code geocoding operations.
 */
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const geocode_es_stack_1 = require("../lib/geocode-es-stack");
const app = new cdk.App();
// Get environment from context (defaults to 'dev')
const environment = app.node.tryGetContext('environment') || 'dev';
// Validate environment
if (!['dev', 'prod'].includes(environment)) {
    throw new Error(`Invalid environment: ${environment}. Must be 'dev' or 'prod'.`);
}
// Common props
const stackProps = {
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
new geocode_es_stack_1.GeocodeEsStack(app, `PricofyGeocodeEsStack-${environment}`, {
    ...stackProps,
    description: `Pricofy Geocode ES (${environment}) - Spanish postal code geocoding Lambda function`,
    environment,
});
console.log(`✅ Stack name: PricofyGeocodeEsStack-${environment}`);
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvY29kZS1lcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlb2NvZGUtZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQTs7OztHQUlHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsOERBQXlEO0FBRXpELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLG1EQUFtRDtBQUNuRCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUM7QUFFbkUsdUJBQXVCO0FBQ3ZCLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztJQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixXQUFXLDRCQUE0QixDQUFDLENBQUM7QUFDbkYsQ0FBQztBQUVELGVBQWU7QUFDZixNQUFNLFVBQVUsR0FBbUI7SUFDakMsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1FBQ3hDLE1BQU0sRUFBRSxXQUFXO0tBQ3BCO0lBQ0QsSUFBSSxFQUFFO1FBQ0osT0FBTyxFQUFFLFNBQVM7UUFDbEIsT0FBTyxFQUFFLFlBQVk7UUFDckIsV0FBVyxFQUFFLFdBQVc7S0FDekI7Q0FDRixDQUFDO0FBRUYsdUVBQXVFO0FBQ3ZFLElBQUksaUNBQWMsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLFdBQVcsRUFBRSxFQUFFO0lBQzlELEdBQUcsVUFBVTtJQUNiLFdBQVcsRUFBRSx1QkFBdUIsV0FBVyxtREFBbUQ7SUFDbEcsV0FBVztDQUNaLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFFbEUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqXG4gKiBQcmljb2Z5IEdlb2NvZGUgRVMgLSBDREsgQXBwIEVudHJ5IFBvaW50XG4gKlxuICogRGVmaW5lcyBMYW1iZGEgZnVuY3Rpb24gZm9yIFNwYW5pc2ggcG9zdGFsIGNvZGUgZ2VvY29kaW5nIG9wZXJhdGlvbnMuXG4gKi9cblxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEdlb2NvZGVFc1N0YWNrIH0gZnJvbSAnLi4vbGliL2dlb2NvZGUtZXMtc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyBHZXQgZW52aXJvbm1lbnQgZnJvbSBjb250ZXh0IChkZWZhdWx0cyB0byAnZGV2JylcbmNvbnN0IGVudmlyb25tZW50ID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAnZGV2JztcblxuLy8gVmFsaWRhdGUgZW52aXJvbm1lbnRcbmlmICghWydkZXYnLCAncHJvZCddLmluY2x1ZGVzKGVudmlyb25tZW50KSkge1xuICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9LiBNdXN0IGJlICdkZXYnIG9yICdwcm9kJy5gKTtcbn1cblxuLy8gQ29tbW9uIHByb3BzXG5jb25zdCBzdGFja1Byb3BzOiBjZGsuU3RhY2tQcm9wcyA9IHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246ICdldS13ZXN0LTEnLFxuICB9LFxuICB0YWdzOiB7IFxuICAgIFByb2plY3Q6IFwiUHJpY29meVwiLFxuICAgIFNlcnZpY2U6IFwiR2VvY29kZS1FU1wiLFxuICAgIEVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcbiAgfSxcbn07XG5cbi8vIEdlb2NvZGUgRVMgU3RhY2s6IExhbWJkYSBmdW5jdGlvbiBmb3IgU3BhbmlzaCBwb3N0YWwgY29kZSBvcGVyYXRpb25zXG5uZXcgR2VvY29kZUVzU3RhY2soYXBwLCBgUHJpY29meUdlb2NvZGVFc1N0YWNrLSR7ZW52aXJvbm1lbnR9YCwge1xuICAuLi5zdGFja1Byb3BzLFxuICBkZXNjcmlwdGlvbjogYFByaWNvZnkgR2VvY29kZSBFUyAoJHtlbnZpcm9ubWVudH0pIC0gU3BhbmlzaCBwb3N0YWwgY29kZSBnZW9jb2RpbmcgTGFtYmRhIGZ1bmN0aW9uYCxcbiAgZW52aXJvbm1lbnQsXG59KTtcblxuY29uc29sZS5sb2coYOKchSBTdGFjayBuYW1lOiBQcmljb2Z5R2VvY29kZUVzU3RhY2stJHtlbnZpcm9ubWVudH1gKTtcblxuYXBwLnN5bnRoKCk7XG5cbiJdfQ==