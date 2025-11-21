# Testing Guide

## Test Strategy

### Test Pyramid

```
        ╱╲
       ╱E2E╲         E2E Tests (TypeScript)
      ╱──────╲        - Test deployed Lambda
     ╱Integration╲    - Real AWS SDK invocations
    ╱────────────╲   - 6 operations + edge cases
   ╱   Unit Tests  ╲  Unit Tests (Go)
  ╱────────────────╲ - Co-located with code
 ╱__________________╲ - Fast, isolated, deterministic
```

## Unit Tests (Go)

### Location

Tests are co-located with code (`*_test.go` in same package):

```
internal/
├── application/
│   ├── service.go
│   └── service_test.go           ← Tests here
├── domain/
│   ├── models.go
│   └── models_test.go            ← Tests here
├── infrastructure/
│   └── provider/
│       ├── postal_provider.go
│       └── postal_provider_test.go  ← Tests here
```

### Running Unit Tests

```bash
# Run all tests
make test

# Run fast (no verbose)
make test-fast

# Run specific package
go test ./internal/application/

# Run specific test
go test -run TestGeocodeByPostal ./internal/application/

# With coverage
go test -cover ./...

# HTML coverage report
make coverage-html
```

### Writing Unit Tests

```go
package application

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestGeocodeByPostal(t *testing.T) {
    // Arrange
    service := NewPostalCodeService()
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    // Act
    result, err := service.GeocodeByPostal(event)
    
    // Assert
    assert.NoError(t, err)
    assert.True(t, result.Success)
    assert.Equal(t, "28001", result.PostalCode)
    assert.Equal(t, "Madrid", result.Municipio)
}
```

### Test Coverage Goals

- **Overall**: > 80%
- **Domain**: 100% (models, errors, constants)
- **Application**: > 90% (business logic)
- **Infrastructure**: > 80% (provider, handler)

### Mocking

Use mocks from `internal/mocks/`:

```go
func TestWithMock(t *testing.T) {
    mockProvider := mocks.NewMockPostalCodeProvider()
    mockProvider.On("GeocodeByPostalCode", "28001").Return(expectedResult, nil)
    
    service := NewPostalCodeServiceWithProvider(mockProvider)
    result, err := service.GeocodeByPostal(event)
    
    assert.NoError(t, err)
    mockProvider.AssertExpectations(t)
}
```

## Integration Tests

### Location

Integration tests are in handler tests:

```
internal/infrastructure/handler/lambda_handler_test.go
```

### Purpose

Test complete Lambda invocation flow:
- Event parsing
- Operation routing
- Service invocation
- Response formatting

### Example

```go
func TestHandler_GeocodeByPostal(t *testing.T) {
    ctx := context.Background()
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    response, err := handler.Handler(ctx, event)
    
    assert.NoError(t, err)
    assert.Equal(t, 200, response.StatusCode)
    
    var body map[string]interface{}
    json.Unmarshal([]byte(response.Body), &body)
    assert.True(t, body["success"].(bool))
}
```

## E2E Tests (TypeScript)

### Location

```
test/e2e/
├── src/
│   ├── client.ts          # Lambda client
│   ├── config.ts          # Test configuration
│   └── geocode-es.test.ts # Test suites
├── package.json
└── tsconfig.json
```

### Setup

```bash
# Install dependencies
make test-e2e-setup

# Or manually
cd test/e2e && npm install
```

### Running E2E Tests

```bash
# Run all E2E tests
make test-e2e

# Run quick health check
make test-e2e-quick

# Run specific test suite
cd test/e2e && npm run test:geocode
cd test/e2e && npm run test:reverse
cd test/e2e && npm run test:validate
cd test/e2e && npm run test:autocomplete
```

### Configuration

Set environment variables:

```bash
export AWS_REGION=eu-west-1
export LAMBDA_FUNCTION_NAME=pricofy-geocode-es-dev
export TEST_TIMEOUT=60000

make test-e2e
```

### Test Coverage

E2E tests cover:
- ✅ All 6 operations
- ✅ Success scenarios
- ✅ Error scenarios (invalid inputs, not found)
- ✅ Performance benchmarks
- ✅ Edge cases

### Example E2E Test

```typescript
describe('Geocode by Postal', () => {
  test('should geocode Madrid postal code (28001)', async () => {
    const response = await client.geocodeByPostal('28001');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.postalCode).toBe('28001');
    expect(response.body.municipio).toBe('Madrid');
  }, 30000);
});
```

## Test Data

### Postal Codes

Test with real Spanish postal codes:
- `28001` - Madrid (capital)
- `08001` - Barcelona
- `41001` - Sevilla
- `46001` - Valencia

### Coordinates

Test with real Spanish coordinates:
- Madrid: `40.4168, -3.7038`
- Barcelona: `41.3851, 2.1734`
- Sevilla: `37.3891, -5.9845`

### Invalid Data

Test error handling:
- Invalid postal code: `99999`
- Invalid coordinates: `999, 999`
- Invalid municipality: `NonExistentCity`

## CI/CD Testing

### GitHub Actions Workflows

1. **quality.yml**: Runs on push/PR
   - Unit tests
   - Coverage report
   - SonarCloud analysis

2. **e2e-tests.yml**: Runs after deployment
   - E2E integration tests
   - Performance benchmarks
   - Health checks

### Local CI Simulation

```bash
# Run full CI pipeline locally
make ci
```

This runs:
1. Clean
2. Install dependencies
3. Build
4. Unit tests
5. Lint

## Performance Testing

### Benchmarks

```go
func BenchmarkGeocodeByPostal(b *testing.B) {
    service := NewPostalCodeService()
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        service.GeocodeByPostal(event)
    }
}
```

Run benchmarks:

```bash
go test -bench=. ./...
```

### Performance Goals

| Operation | Target | Actual |
|-----------|--------|--------|
| geocode-by-postal | <1ms | <1ms ✅ |
| reverse-geocode | <20ms | ~10-20ms ✅ |
| validate-postal | <1ms | <1ms ✅ |
| validate-municipio | <1ms | <1ms ✅ |
| autocomplete-postal | <5ms | <5ms ✅ |
| autocomplete-municipio | <10ms | <10ms ✅ |

## Troubleshooting

### Test Failures

```bash
# Run with verbose output
go test -v ./...

# Run specific failing test
go test -v -run TestName ./package/

# Check test coverage
make coverage-html
```

### E2E Test Failures

```bash
# Check Lambda is deployed
aws lambda get-function --function-name pricofy-geocode-es-dev

# Check AWS credentials
aws sts get-caller-identity

# View Lambda logs
make logs-geocode ENV=dev

# Test Lambda directly
make test-geocode ENV=dev
```

### Coverage Issues

```bash
# Generate detailed coverage report
make coverage-html

# Check coverage by package
go test -cover ./...

# Identify untested code
go tool cover -html=coverage.out
```

## Best Practices

### 1. Test Naming

```go
// Good
func TestGeocodeByPostal_ValidPostalCode_ReturnsCoordinates(t *testing.T)
func TestGeocodeByPostal_InvalidPostalCode_ReturnsError(t *testing.T)

// Bad
func TestGeocode(t *testing.T)
func Test1(t *testing.T)
```

### 2. Test Structure (AAA Pattern)

```go
func TestExample(t *testing.T) {
    // Arrange
    service := NewService()
    input := createTestInput()
    
    // Act
    result, err := service.DoSomething(input)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expected, result)
}
```

### 3. Table-Driven Tests

```go
func TestGeocodeByPostal(t *testing.T) {
    tests := []struct {
        name        string
        postalCode  string
        wantSuccess bool
        wantError   bool
    }{
        {"Valid postal code", "28001", true, false},
        {"Invalid postal code", "99999", false, true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

### 4. Test Independence

- Each test should be independent
- No shared state between tests
- Use fresh instances
- Clean up after tests

### 5. Test Coverage

- Focus on business logic
- Test edge cases
- Test error paths
- Don't test trivial code

---

**Last Updated:** November 2025  
**Version:** 1.0.0

