# Pricofy Geocode ES

Spanish postal code geocoding and validation microservice for Pricofy.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange.svg)](https://aws.amazon.com/lambda/)
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

## 🎯 What This Does

Provides **Spanish postal code geocoding, validation, and autocomplete** for Pricofy:

- **Geocode by Postal Code**: Convert Spanish postal codes to coordinates (O(1), <1ms)
- **Reverse Geocode**: Find nearest postal code from GPS coordinates (Haversine, ~10-20ms)
- **Validate Postal Code**: Check if postal code exists (O(1), <1ms)
- **Validate Municipality**: Check if municipality exists (O(1), <1ms)
- **Autocomplete Postal Code**: Prefix-based search (sorted array, <5ms)
- **Autocomplete Municipality**: Fuzzy search (starts-with priority, <10ms)

**Data Source:** Static database of **11,150 Spanish postal codes** from GeoNames.

**Architecture:** Single Lambda function invoked directly by `pricofy-location-service` via AWS Lambda SDK (no API Gateway).

**Performance:** <1ms postal lookup, ~10-20ms reverse geocode, <5ms autocomplete.

---

## ⚠️ Important: Lambda-to-Lambda Invocation

**This is NOT a REST API.** This service is invoked directly via AWS Lambda SDK.

**Why single Lambda with internal routing?**
- ✅ **Single cold start** - All 6 operations share the same Lambda instance
- ✅ **Shared in-memory data** - 11,150 postal codes loaded once in memory
- ✅ **Lower latency** - No API Gateway overhead (~10-20ms saved)
- ✅ **Lower cost** - No API Gateway charges ($3.50/million vs $0)
- ✅ **Simpler deployment** - One Lambda, one version, one CloudFormation stack

**Invocation example from location-service:**
```typescript
const result = await lambda.invoke({
  FunctionName: 'pricofy-geocode-es-dev',
  Payload: JSON.stringify({
    operation: 'geocode-by-postal',
    postalCode: '28001'
  })
}).promise();

const response = JSON.parse(result.Payload as string);
// { statusCode: 200, body: '{"success":true,...}' }
```

**Trade-off:** Less "RESTful" (manual routing), but **significantly more efficient** for internal microservice communication.

---

## 🏗️ Architecture

### Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Entry Point (Handler)                         │
│                     geocode (routing)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Operations Layer                               │
│  geocode-by-postal, reverse-geocode, validate-postal,           │
│  validate-municipio, autocomplete-postal, autocomplete-municipio │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Layer (Service)                    │
│              PostalCodeService                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Infrastructure Layer (Provider)                     │
│         PostalCodeProvider - Static database + indices           │
│                                                                  │
│  Shared Services:                                               │
│  - Logger (structured CloudWatch logs)                          │
│  - Custom Error Classes (LocationError hierarchy)               │
│  - CORS helpers (cross-origin resource sharing)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Single Lambda with Routing

**One Lambda function** (`pricofy-geocode-es-{env}`) handles all 6 operations via internal routing:

```typescript
POST { "operation": "geocode-by-postal", "postalCode": "28001" }
POST { "operation": "reverse-geocode", "lat": 40.4168, "lon": -3.7038 }
POST { "operation": "validate-postal", "postalCode": "28001" }
POST { "operation": "validate-municipio", "municipio": "Madrid" }
POST { "operation": "autocomplete-postal", "prefix": "280", "limit": 5 }
POST { "operation": "autocomplete-municipio", "query": "mad", "limit": 5 }
```

---

## 🚀 Features

### 1. Static Spanish Postal Codes Database

- **Source:** GeoNames (11,150 unique postal codes)
- **Format:** JSON with lat/lon, municipio, provincia
- **Performance:** Loaded once into memory, O(1) lookups via indices
- **Benefits:** ✅ Unlimited requests ✅ Sub-millisecond latency ✅ Zero external APIs

### 2. Optimized In-Memory Indices

```typescript
{
  codes: Map<postalCode, data>,           // O(1) postal code lookup
  municipioIndex: Map<municipio, entries>, // O(1) municipality lookup
  municipioSet: Set<municipio>,            // O(1) validation
  sortedPostalCodes: string[]              // Binary search for autocomplete
}
```

### 3. Six Operations

| Operation | Purpose | Complexity | Latency |
|-----------|---------|------------|---------|
| geocode-by-postal | Postal → Coords | O(1) | <1ms |
| reverse-geocode | Coords → Postal | O(n) Haversine | ~10-20ms |
| validate-postal | Check postal exists | O(1) | <1ms |
| validate-municipio | Check municipality exists | O(1) | <1ms |
| autocomplete-postal | Prefix search | O(log n) | <5ms |
| autocomplete-municipio | Fuzzy search | O(n) | <10ms |

---

## 📦 Installation

```bash
# Install dependencies
make install

# Build Lambda package
make build

# Run tests
make test
```

---

## 🧪 Testing

### Run Tests Locally

```bash
npm test                 # Run all tests with coverage
npm run test:watch       # Watch mode
```

### Test Lambda (After Deployment)

```bash
make test-geocode ENV=dev   # Test all operations
```

**Manual invoke:**

```bash
# Geocode by postal code
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"body":"{\"operation\":\"geocode-by-postal\",\"postalCode\":\"28001\"}"}' \
  response.json && cat response.json

# Reverse geocode
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"body":"{\"operation\":\"reverse-geocode\",\"lat\":40.4168,\"lon\":-3.7038}"}' \
  response.json && cat response.json

# Validate postal code
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"body":"{\"operation\":\"validate-postal\",\"postalCode\":\"28001\"}"}' \
  response.json && cat response.json
```

---

## 🚢 Deployment

### Via Makefile (Recommended)

```bash
# Full deployment (clean + test + deploy)
make deploy ENV=dev

# Quick deploy (skip tests)
make deploy-quick ENV=dev

# Destroy environment
make destroy-dev
```

### Via CDK Directly

```bash
cd infrastructure
npm run deploy:dev   # Deploy to dev
npm run deploy:prod  # Deploy to prod
```

### First-Time Setup

```bash
# 1. Install dependencies
make install

# 2. Verify prerequisites
make verify ENV=dev

# 3. Deploy
make deploy ENV=dev
```

---

## 🔧 Development

### Project Structure

```
pricofy-geocode-es/
├── src/
│   ├── handlers/
│   │   └── geocode.ts              # Routing handler
│   ├── operations/                  # Operation implementations
│   │   ├── geocode-by-postal.ts
│   │   ├── reverse-geocode.ts
│   │   ├── validate-postal.ts
│   │   ├── validate-municipio.ts
│   │   ├── autocomplete-postal.ts
│   │   └── autocomplete-municipio.ts
│   ├── services/
│   │   └── postal-code-service.ts   # Business logic
│   ├── providers/
│   │   └── postal-code-provider.ts  # Data access + indices
│   ├── types/
│   │   ├── index.ts                 # Type definitions
│   │   ├── errors.ts                # Custom errors
│   │   └── constants.ts             # Constants
│   ├── utils/
│   │   ├── logger.ts                # Structured logging
│   │   └── cors.ts                  # CORS headers
│   └── data/
│       └── postal-codes-es.json     # 11,150 postal codes
├── test/                             # Unit tests
├── infrastructure/                   # CDK infrastructure
└── api/                              # OpenAPI spec
```

### Makefile Commands

```bash
make help          # Show all commands
make install       # Install dependencies
make build         # Compile TypeScript + copy data
make test          # Run tests
make lint          # Run linter
make clean         # Clean artifacts
make deploy        # Full deployment
make logs-geocode  # View Lambda logs
```

---

## 📊 Monitoring

### CloudWatch Logs

```bash
# View live logs
make logs-geocode ENV=dev

# Or directly
aws logs tail /aws/lambda/pricofy-geocode-es-dev --follow
```

### CloudWatch Insights Queries

```sql
-- Find all errors
fields @timestamp, component, message, error
| filter level = "ERROR"
| sort @timestamp desc

-- Track operation distribution
fields @timestamp, operation
| filter message like /Processing request/
| stats count() by operation
```

---

## 🔐 Security

### Private Lambda Function

- **No public endpoints** (no API Gateway, no Function URLs)
- **Only invokable by** `pricofy-location-service` via IAM role
- **IAM-based authentication** only
- **CORS headers** for cross-origin requests (when proxied via pricofy-api)

### Security Model

```
pricofy-api (API Gateway)
    ↓
pricofy-location-service (Orchestrator)
    ↓ [Lambda Invoke + IAM Role]
pricofy-geocode-es (Country Worker)
```

---

## 📝 API Documentation

See [api/openapi.yaml](./api/openapi.yaml) for full OpenAPI 3.0 specification.

**Key endpoints:**

- `POST /geocode` with `operation: "geocode-by-postal"`
- `POST /geocode` with `operation: "reverse-geocode"`
- `POST /geocode` with `operation: "validate-postal"`
- `POST /geocode` with `operation: "validate-municipio"`
- `POST /geocode` with `operation: "autocomplete-postal"`
- `POST /geocode` with `operation: "autocomplete-municipio"`

---

## 🤝 Integration

### Invoked by pricofy-location-service

```typescript
// pricofy-location-service delegates to pricofy-geocode-es
const result = await lambda.invoke({
  FunctionName: 'pricofy-geocode-es-dev',
  Payload: JSON.stringify({
    operation: 'geocode-by-postal',
    postalCode: '28001'
  })
}).promise();
```

---

## 📚 Learn More

- [CLAUDE.md](./CLAUDE.md) - Detailed technical documentation
- [api/openapi.yaml](./api/openapi.yaml) - OpenAPI specification
- [infrastructure/](./infrastructure/) - CDK infrastructure code

---

## 📄 License

Private - © 2024 Pricofy

---

**Questions?** See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation.
