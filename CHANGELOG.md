# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-18

### Added

**Initial release of pricofy-geocode-es - Spanish Postal Code Geocoding Service**

This service was created by extracting Spanish-specific geocoding logic from `pricofy-location-service` into a dedicated microservice, following a country-based service separation strategy.

#### Architecture
- **Hexagonal architecture** (Ports & Adapters) with clean separation of concerns
- **Single Lambda function** (`pricofy-geocode-es-{env}`) with operation-based routing
- **Handler:** `src/handlers/geocode.ts` routes to 6 operations
- **Service Layer:** `PostalCodeService` orchestrates business logic
- **Provider Layer:** `PostalCodeProvider` manages static postal code database
- **Utilities:** Structured logging (`Logger`), custom error hierarchy, type definitions

#### Operations (6 total)
1. **geocode-by-postal** - Convert postal code or municipality to coordinates
2. **reverse-geocode** - Find nearest postal code from GPS coordinates (Haversine distance)
3. **validate-postal** - Validate if postal code exists in database
4. **validate-municipio** - Validate if municipality name exists
5. **autocomplete-postal** - Autocomplete postal codes by prefix (binary search)
6. **autocomplete-municipio** - Autocomplete municipality names by query

#### Data & Performance
- **Static postal code database:** 11,150 Spanish postal codes from GeoNames
- **In-memory indices:** O(1) lookups for postal codes and municipalities
- **Autocompletion:** Binary search on sorted arrays for fast prefix matching
- **Reverse geocoding:** Linear scan with Haversine distance calculation (~10-20ms)
- **No external APIs:** Zero dependencies, unlimited requests, no rate limits

#### Testing
- **100 tests** across all operations and edge cases
- **Coverage:** 93.47% statements, 82.63% branches, 84% functions
- **No mocks:** Real data testing with actual postal code database
- **Test structure:** Organized by handlers, operations, services, providers

#### Infrastructure
- **CDK Stack:** `GeocodeEsStack` deploys single Lambda function
- **Memory:** 512MB (optimized for 11,150 postal code database)
- **Timeout:** 30 seconds
- **IAM:** Minimal permissions (CloudWatch Logs only)
- **Invocation:** Private Lambda (IAM auth only, no API Gateway)

#### DevOps
- **Makefile:** 10 targets (install, build, test, verify, deploy, deploy-quick, clean, destroy, help)
- **GitHub Actions:** Auto-deploy to DEV on push to `develop`, manual dispatch for PROD
- **Pre-deployment verification:** Script validates AWS CLI, CDK, environment variables
- **OIDC authentication:** No long-lived AWS credentials

#### Documentation
- **OpenAPI 3.0 specification** (`api/openapi.yaml`) - Complete API documentation
- **CLAUDE.md** - Comprehensive technical documentation for AI assistants
- **README.md** - Overview, quick start, deployment guide
- **API README** (`api/README.md`) - API usage, validation, testing examples

#### Code Quality
- **TypeScript 5.3+** with strict mode
- **ESLint** configuration with TypeScript rules
- **Jest** for unit testing with ts-jest
- **Coverage thresholds:** Enforced in `jest.config.js`
- **.cursorrules** - AI assistant coding standards
- **Structured logging** - JSON logs for CloudWatch Insights
- **Custom error types** - 5 error classes for better error handling

#### Security
- **No public endpoints** - Only invokable by `pricofy-location-service`
- **IAM authentication** - Requires `lambda:InvokeFunction` permission
- **No CORS** - Internal service (Lambda-to-Lambda invocation)
- **Environment variables** - No hardcoded secrets

#### Integration
- **Invoked by:** `pricofy-location-service` (orchestrator)
- **Country parameter:** `country: 'ES'` routes to this service
- **Request format:** Same structure as location-service for consistency
- **Response format:** Standard Lambda response with `statusCode` and `body`

### Notes

**Why this service exists:**
- Separates global operations (IP geolocation via MaxMind/ipapi) from country-specific operations
- Enables independent scaling and deployment of Spanish geocoding
- Simplifies adding new countries (e.g., `pricofy-geocode-fr`, `pricofy-geocode-uk`)
- Reduces complexity in `pricofy-location-service` (now acts as orchestrator)

**What was extracted from pricofy-location-service:**
- All Spanish postal code operations (handlers, services, providers)
- Static postal code database (`src/resources/postal-codes-es.json`)
- Haversine distance calculation logic
- Postal code and municipality validation/autocompletion

**What remains in pricofy-location-service:**
- IP-based geolocation (MaxMind + ipapi.co fallback)
- Orchestration logic (routes to country-specific services)
- Global operations (not country-specific)

**Migration strategy:**
- **Big bang approach** - All Spanish code moved at once
- Old handlers in location-service will be deprecated and removed
- Location-service will invoke this Lambda for Spanish operations
- No breaking changes to frontend (same API contract)

---

**Repository:** https://github.com/Pricofy/pricofy-geocode-es  
**Parent Service:** [pricofy-location-service](https://github.com/Pricofy/pricofy-location-service)  
**Related Services:** pricofy-api, pricofy-infra  
**Tech Stack:** TypeScript, Node.js 20.x, AWS Lambda, CDK, Jest
