# E2E Tests for Pricofy Geocode ES

End-to-end integration tests for the Spanish geocoding Lambda function.

## Prerequisites

- AWS CLI configured with valid credentials
- Lambda function deployed (`pricofy-geocode-es-dev` or `pricofy-geocode-es-prod`)
- Node.js 20+ installed

## Installation

```bash
npm install
```

Or via Makefile (from project root):

```bash
make test-e2e-setup
```

## Running Tests

### All tests

```bash
npm test
```

Or via Makefile:

```bash
make test-e2e
```

### Quick health check

```bash
npm run test:quick
```

Or via Makefile:

```bash
make test-e2e-quick
```

### Specific test suites

```bash
npm run test:geocode       # Geocode by postal tests
npm run test:reverse       # Reverse geocode tests
npm run test:validate      # Validation tests
npm run test:autocomplete  # Autocomplete tests
```

## Configuration

Tests use environment variables:

- `AWS_REGION` - AWS region (default: `eu-west-1`)
- `LAMBDA_FUNCTION_NAME` - Lambda function name (default: `pricofy-geocode-es`)
- `TEST_TIMEOUT` - Test timeout in ms (default: `60000`)

Example:

```bash
AWS_REGION=eu-west-1 LAMBDA_FUNCTION_NAME=pricofy-geocode-es-dev npm test
```

## Test Coverage

- **Geocode by Postal**: Postal code and municipality geocoding
- **Reverse Geocode**: Coordinates to postal code
- **Validate Postal**: Postal code validation
- **Validate Municipality**: Municipality validation
- **Autocomplete Postal**: Postal code autocomplete
- **Autocomplete Municipality**: Municipality autocomplete
- **Error Handling**: Invalid inputs, not found cases
- **Performance**: Latency measurements

## CI/CD Integration

Tests run automatically:

- After deployment (via GitHub Actions workflow `e2e-tests.yml`)
- On schedule (daily at 2 AM UTC)
- On manual trigger

## Troubleshooting

### Lambda not found

Ensure the Lambda function is deployed:

```bash
aws lambda get-function --function-name pricofy-geocode-es-dev
```

### Permission denied

Ensure your AWS credentials have `lambda:InvokeFunction` permission:

```json
{
  "Effect": "Allow",
  "Action": "lambda:InvokeFunction",
  "Resource": "arn:aws:lambda:*:*:function:pricofy-geocode-es-*"
}
```

### Timeout errors

Increase test timeout:

```bash
TEST_TIMEOUT=120000 npm test
```

