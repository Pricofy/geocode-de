# Development Guide

## Prerequisites

- Go 1.24+
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)
- Node.js 20+ (for CDK and E2E tests)
- golangci-lint (optional, for linting)

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/Pricofy/pricofy-geocode-es.git
cd pricofy-geocode-es
```

### 2. Install Dependencies

```bash
make install
```

This installs:
- Go dependencies (`go mod download`)
- CDK infrastructure dependencies (`npm install`)

### 3. Verify Setup

```bash
make verify ENV=dev
```

Checks:
- AWS CLI configured
- AWS credentials valid
- CDK bootstrapped

## Development Workflow

### Build

```bash
# Build for Lambda (Linux ARM64)
make build

# Build for local development (native architecture)
make build-local
```

### Run Tests

```bash
# Run all tests with coverage
make test

# Run tests without verbose output (faster)
make test-fast

# Generate HTML coverage report
make coverage-html
```

### Lint

```bash
make lint
```

### Clean

```bash
make clean
```

## Project Structure

```
pricofy-geocode-es/
├── cmd/
│   └── lambda/
│       ├── main.go              # Entry point with DI
│       └── main_test.go         # Handler tests
├── internal/
│   ├── application/
│   │   ├── service.go           # Business logic
│   │   ├── service_test.go      # Service tests
│   │   ├── operations.go        # Operation handlers
│   │   └── operations_test.go   # Operation tests
│   ├── domain/
│   │   ├── models.go            # Data models
│   │   ├── models_test.go       # Model tests
│   │   ├── errors.go            # Custom errors
│   │   ├── errors_test.go       # Error tests
│   │   └── constants.go         # Constants
│   ├── infrastructure/
│   │   ├── provider/
│   │   │   ├── postal_provider.go       # Data provider
│   │   │   ├── postal_provider_test.go  # Provider tests
│   │   │   └── postal-codes-es.json     # Postal codes data
│   │   └── handler/
│   │       ├── lambda_handler.go        # Lambda handler
│   │       └── lambda_handler_test.go   # Handler tests
│   ├── shared/
│   │   └── logger/
│   │       ├── logger.go        # Structured logger
│   │       └── logger_test.go   # Logger tests
│   └── mocks/
│       ├── provider_mock.go     # Provider mock
│       └── service_mock.go      # Service mock
├── test/
│   └── e2e/                     # E2E tests (TypeScript)
├── infrastructure/              # CDK infrastructure
├── docs/                        # Documentation
└── Makefile                     # Build automation
```

## Testing

### Unit Tests

Tests are co-located with code (`*_test.go` in same package):

```bash
# Run all unit tests
go test ./...

# Run tests for specific package
go test ./internal/application/

# Run with coverage
go test -cover ./...

# Run with verbose output
go test -v ./...
```

### Integration Tests

Integration tests are in `internal/infrastructure/handler/lambda_handler_test.go`:

```bash
go test ./internal/infrastructure/handler/
```

### E2E Tests

E2E tests are in TypeScript and test deployed Lambda:

```bash
# Install E2E dependencies
make test-e2e-setup

# Run all E2E tests
make test-e2e

# Run quick health check
make test-e2e-quick
```

## Debugging

### Local Testing

```bash
# Build local binary
make build-local

# Run binary locally (simulates Lambda)
./pricofy-geocode-es
```

### Test Specific Operation

```go
// In your test file
func TestGeocodeByPostal(t *testing.T) {
    service := application.NewPostalCodeService()
    
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    result, err := service.GeocodeByPostal(event)
    
    assert.NoError(t, err)
    assert.True(t, result.Success)
}
```

### View Logs

```bash
# View Lambda logs (requires deployed function)
make logs-geocode ENV=dev

# Or use AWS CLI directly
aws logs tail /aws/lambda/pricofy-geocode-es-dev --follow
```

## Deployment

### Deploy to Dev

```bash
# Safe deployment (runs tests)
make deploy ENV=dev

# Quick deployment (skips tests)
make deploy-quick ENV=dev
```

### Deploy to Prod

```bash
make deploy ENV=prod
```

### Test Deployed Function

```bash
make test-geocode ENV=dev
```

## Code Style

### Go Conventions

- Use `gofmt` for formatting
- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use descriptive variable names
- Document exported functions
- Keep functions small and focused

### Example

```go
// GeocodeByPostal geocodes a postal code or municipality to coordinates.
// Tries postal code first (faster, O(1)), then municipality if not found (O(n)).
//
// Parameters:
//   - event: LambdaEvent containing postalCode or municipio in the body
//
// Returns:
//   - GeocodingResult with coordinates and metadata
//   - error if validation fails or postal code not found
func (s *PostalCodeService) GeocodeByPostal(event domain.LambdaEvent) (domain.GeocodingResult, error) {
    // Implementation
}
```

### Error Handling

Always use custom error types:

```go
if !postalCodeRegex.MatchString(postalCode) {
    return domain.GeocodingResult{}, domain.NewValidationError(
        "Invalid postal code format: expected 5 digits",
        "postalCode",
    )
}
```

### Logging

Use structured logging:

```go
logger.Info("PostalCodeService", "Geocoding completed", map[string]interface{}{
    "postalCode": postalCode,
    "municipio":  result.Municipio,
    "latency":    time.Since(start).Milliseconds(),
})
```

## Common Tasks

### Add New Operation

1. Add operation to `domain/models.go`:
```go
type NewOperationRequest struct {
    Operation string `json:"operation"`
    // ... fields
}
```

2. Add handler to `application/service.go`:
```go
func (s *PostalCodeService) NewOperation(event domain.LambdaEvent) (Result, error) {
    // Implementation
}
```

3. Add routing in `cmd/lambda/main.go`:
```go
case "new-operation":
    return handleNewOperation(ctx, event, a.service)
```

4. Add tests:
```go
func TestNewOperation(t *testing.T) {
    // Test implementation
}
```

### Update Postal Codes Data

1. Download latest GeoNames data
2. Convert to JSON format
3. Replace `internal/infrastructure/provider/postal-codes-es.json`
4. Run tests to verify
5. Deploy

### Add New Country

1. Create new service: `pricofy-geocode-{country}`
2. Copy structure from `pricofy-geocode-es`
3. Replace postal codes data
4. Update country-specific logic
5. Deploy

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
make clean
make build

# Check Go version
go version  # Should be 1.24+

# Update dependencies
make deps
```

### Test Failures

```bash
# Run tests with verbose output
go test -v ./...

# Run specific test
go test -v -run TestGeocodeByPostal ./internal/application/

# Check coverage
make coverage-html
```

### Deployment Errors

```bash
# Verify prerequisites
make verify ENV=dev

# Check AWS credentials
aws sts get-caller-identity

# Check CDK bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit
```

### Lambda Errors

```bash
# View logs
make logs-geocode ENV=dev

# Test function
make test-geocode ENV=dev

# Invoke directly
aws lambda invoke \
  --function-name pricofy-geocode-es-dev \
  --payload '{"body":"{\"operation\":\"geocode-by-postal\",\"postalCode\":\"28001\"}"}' \
  response.json
```

## Resources

- [Go Documentation](https://golang.org/doc/)
- [AWS Lambda Go](https://github.com/aws/aws-lambda-go)
- [AWS CDK](https://docs.aws.amazon.com/cdk/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Project README](../README.md)
- [Architecture](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)

---

**Last Updated:** November 2025  
**Version:** 1.0.0

