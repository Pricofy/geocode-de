# Pricofy Geocode ES API Documentation

Contract specification for the Spanish postal code geocoding service.

## 📄 Files

- **[openapi.yaml](./openapi.yaml)** - OpenAPI 3.0 specification (documents Lambda invocation contract, NOT a REST API)

## ⚠️ Important: Lambda-to-Lambda Invocation

**This is NOT a REST API.** This service is invoked directly via AWS Lambda SDK from `pricofy-location-service`.

**Why single Lambda with routing?**
- ✅ **Single cold start** - All operations share the same Lambda instance
- ✅ **Shared in-memory data** - 11,150 postal codes loaded once
- ✅ **Lower latency** - No API Gateway overhead (~10-20ms saved)
- ✅ **Lower cost** - No API Gateway charges
- ✅ **Simpler deployment** - One Lambda, one version

**OpenAPI Purpose:** Documents the invocation payload structure, not HTTP endpoints.

## 🎯 Overview

**Pricofy Geocode ES** is an internal microservice that provides Spanish postal code operations:

- **geocode-by-postal**: Convert postal codes to coordinates
- **reverse-geocode**: Find nearest postal code from GPS coordinates
- **validate-postal**: Check if postal code exists
- **validate-municipality**: Check if municipality exists
- **autocomplete-postal**: Search postal codes by prefix
- **autocomplete-municipality**: Search municipalities by query

**Architecture**: Single Lambda function with internal routing via `operation` parameter.

**Invocation**: Direct Lambda SDK invocation from `pricofy-location-service` (no HTTP, no API Gateway).

**Data Source**: Static database of **11,150 Spanish postal codes** from GeoNames.

## 📖 Viewing the Documentation

### Option 1: Swagger UI (Online)

Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `openapi.yaml`.

### Option 2: Redoc (Online)

Visit [Redoc Demo](https://redocly.github.io/redoc/) and load `openapi.yaml`.

### Option 3: Local with Docker

```bash
# Serve with Swagger UI
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/api/openapi.yaml \
  -v $(pwd):/api \
  swaggerapi/swagger-ui

# Open http://localhost:8080
```

### Option 4: Redocly CLI

```bash
# Install Redocly CLI
npm install -g @redocly/cli

# Serve locally
redocly preview-docs api/openapi.yaml

# Open http://localhost:8080
```

## ✅ Validation

### Validate OpenAPI Spec

```bash
# Install Redocly CLI
npm install -g @redocly/cli

# Validate
redocly lint api/openapi.yaml
```

Expected output: `✓ OpenAPI file is valid`

### Validate with Swagger CLI

```bash
# Install Swagger CLI
npm install -g @apidevtools/swagger-cli

# Validate
swagger-cli validate api/openapi.yaml
```

## 🧪 Testing

### Lambda SDK Invocation (from pricofy-location-service)

```typescript
import { Lambda } from 'aws-sdk';

const lambda = new Lambda();

const result = await lambda.invoke({
  FunctionName: process.env.GEOCODE_ES_FUNCTION_NAME || 'pricofy-geocode-es-dev',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({
    operation: 'geocode-by-postal',
    postalCode: '28001'
  })
}).promise();

const response = JSON.parse(result.Payload as string);
// response = { statusCode: 200, body: '{"success":true,...}' }
```

### Manual Testing (AWS CLI)

```bash
# Geocode by postal code
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"operation":"geocode-by-postal","postalCode":"28001"}' \
  response.json && cat response.json | jq

# Reverse geocode
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"operation":"reverse-geocode","lat":40.4168,"lon":-3.7038}' \
  response.json && cat response.json | jq

# Validate postal code
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"operation":"validate-postal","postalCode":"28001"}' \
  response.json && cat response.json | jq

# Validate municipality
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"operation":"validate-municipality","municipality":"Madrid"}' \
  response.json && cat response.json | jq

# Autocomplete postal code
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"operation":"autocomplete-postal","prefix":"280","limit":5}' \
  response.json && cat response.json | jq

# Autocomplete municipality
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"operation":"autocomplete-municipality","query":"mad","limit":5}' \
  response.json && cat response.json | jq
```

## 📊 Invocation Payload Examples

### Geocode by Postal Code

**Lambda Invoke Payload:**
```json
{
  "operation": "geocode-by-postal",
  "postalCode": "28001"
}
```

**Lambda Response:**
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"coords\":{\"lat\":40.4168,\"lon\":-3.7038},\"municipality\":\"Madrid\",\"province\":\"Madrid\",\"postalCode\":\"28001\",\"source\":\"postal_code\"}"
}
```

### Reverse Geocode

**Lambda Invoke Payload:**
```json
{
  "operation": "reverse-geocode",
  "lat": 40.4168,
  "lon": -3.7038
}
```

**Lambda Response:**
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"city\":\"Madrid\",\"postalCode\":\"28001\",\"province\":\"Madrid\",\"country\":\"España\",\"coords\":{\"lat\":40.4168,\"lon\":-3.7038},\"distance\":0.142}"
}
```

### Validate Postal Code

**Lambda Invoke Payload:**
```json
{
  "operation": "validate-postal",
  "postalCode": "28001"
}
```

**Lambda Response:**
```json
{
  "statusCode": 200,
  "body": "{\"valid\":true,\"value\":\"28001\"}"
}
```

### Autocomplete Postal Code

**Lambda Invoke Payload:**
```json
{
  "operation": "autocomplete-postal",
  "prefix": "280",
  "limit": 3
}
```

**Lambda Response:**
```json
{
  "statusCode": 200,
  "body": "{\"results\":[{\"postalCode\":\"28001\",\"municipality\":\"Madrid\",\"province\":\"Madrid\"},{\"postalCode\":\"28002\",\"municipality\":\"Madrid\",\"province\":\"Madrid\"},{\"postalCode\":\"28003\",\"municipality\":\"Madrid\",\"province\":\"Madrid\"}],\"count\":3}"
}
```

## 🔐 Security

- **Internal Service**: No public HTTP endpoints, no API Gateway
- **IAM Authentication**: Only invokable by `pricofy-location-service` with IAM permissions
- **No API Keys**: Uses AWS IAM for authorization
- **Private Lambda**: No Function URLs, no REST API, no public access

## 🏗️ Architecture Decision: Why Single Lambda?

**Alternative considered:** 6 separate Lambdas (one per operation) or API Gateway with multiple endpoints.

**Why we chose single Lambda with internal routing:**

| Aspect | Single Lambda (chosen) | 6 Lambdas | API Gateway |
|--------|------------------------|-----------|-------------|
| **Cold starts** | 1 (shared) | 6 (separate) | 1 + API GW overhead |
| **Memory efficiency** | Shared 11,150 codes | 6x duplicated data | Same as single |
| **Latency** | <1ms routing | Same | +10-20ms API GW |
| **Cost** | 1 Lambda | 6 Lambdas | Lambda + API GW |
| **Deployment** | Simple | 6 deploys | API config |
| **Invocation** | Lambda SDK | Lambda SDK | HTTP (overkill) |

**Trade-off:** Less "RESTful", but **significantly more efficient** for Lambda-to-Lambda communication.

## 📚 Learn More

- [Main README](../README.md) - Service overview
- [CLAUDE.md](../CLAUDE.md) - Detailed technical documentation
- [OpenAPI Specification](./openapi.yaml) - Complete API spec
