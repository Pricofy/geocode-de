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

### Coverage Goals

- **Overall**: ≥ 90% (current: 91.0%)
- **Domain**: 100% (models, errors, constants)
- **Application**: ≥ 90% (business logic)
- **Infrastructure**: ≥ 80% (provider, handler)
- **cmd**: ≥ 80% (Lambda entry point with DI)

## Unit Tests (Go)

### Location

Tests are co-located with code (`*_test.go` in same package):

```
internal/
├── application/
│   ├── operations.go
│   ├── operations_test.go       ← Operation handlers
│   ├── service.go
│   └── service_test.go          ← Business logic
├── domain/
│   ├── models.go
│   └── models_test.go           ← Domain models
├── infrastructure/
│   ├── handler/
│   │   ├── lambda_handler.go
│   │   └── lambda_handler_test.go  ← Integration tests
│   └── provider/
│       ├── postal_provider.go
│       └── postal_provider_test.go  ← Data provider
├── shared/
│   └── logger/
│       ├── logger.go
│       └── logger_test.go       ← Shared utilities
cmd/
├── main.go
└── main_test.go                 ← Entry point with DI
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

# Coverage with threshold check (90%)
make coverage
```

### Dependency Injection in Tests

The Lambda entry point (`cmd/main.go`) uses the **App struct** for dependency injection:

```go
type App struct {
    service *application.PostalCodeService
    logger  *logger.Logger
}

func NewApp() (*App, error) {
    appLogger := logger.NewLogger("GeocodeES")
    service := application.NewPostalCodeService(appLogger)
    return &App{
        service: service,
        logger:  appLogger,
    }, nil
}
```

**Testing with DI:**

```go
func TestApp_Initialization(t *testing.T) {
    // Test that App initializes correctly
    app, err := NewApp()
    
    assert.NoError(t, err)
    assert.NotNil(t, app)
    assert.NotNil(t, app.service)
    assert.NotNil(t, app.logger)
}

func TestApp_HandleRequest(t *testing.T) {
    // Test operation routing through App
    app, _ := NewApp()
    ctx := context.Background()
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    response, err := app.HandleRequest(ctx, event)
    
    assert.NoError(t, err)
    assert.Equal(t, 200, response.StatusCode)
}
```

**Benefits:**
- Services initialized once during cold start (shared across warm invocations)
- Easy to test with mock dependencies
- Clear separation of concerns
- Follows hexagonal architecture principles

### Writing Unit Tests

```go
package application

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestGeocodeByPostal(t *testing.T) {
    // Arrange
    logger := logger.NewLogger("Test")
    service := NewPostalCodeService(logger)
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

### Mocking

Use mocks from `internal/mocks/` (when available):

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

**Note:** Currently, the service uses the real provider in tests. For true unit testing isolation, consider:
1. Extracting a `PostalCodeProvider` interface
2. Creating mock implementations in `internal/mocks/`
3. Injecting the provider via DI

## Integration Tests

### Location

Integration tests are in handler tests:

```
internal/infrastructure/handler/lambda_handler_test.go
```

### Purpose

Test complete Lambda invocation flow:
- Event parsing (direct Lambda + API Gateway proxy)
- Operation routing
- Service invocation
- Response formatting
- Error handling

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
├── package.json           # NPM scripts
├── tsconfig.json
└── README.md
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

# Run specific operation tests
make test-e2e-geocode        # Geocode by postal
make test-e2e-reverse        # Reverse geocode
make test-e2e-validate       # Validate operations
make test-e2e-autocomplete   # Autocomplete operations

# Or use npm scripts directly
cd test/e2e
npm run test                        # All tests
npm run test:quick                  # Health check only
npm run test:geocode                # Geocode tests
npm run test:reverse                # Reverse geocode tests
npm run test:validate               # All validate tests
npm run test:validate:postal        # Validate postal only
npm run test:validate:municipio     # Validate municipio only
npm run test:autocomplete           # All autocomplete tests
npm run test:autocomplete:postal    # Autocomplete postal only
npm run test:autocomplete:municipio # Autocomplete municipio only
npm run test:errors                 # Error handling tests
npm run test:performance            # Performance benchmarks
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
- ✅ All 6 operations (geocode-by-postal, reverse-geocode, validate-postal, validate-municipio, autocomplete-postal, autocomplete-municipio)
- ✅ Success scenarios
- ✅ Error scenarios (invalid inputs, not found)
- ✅ Performance benchmarks
- ✅ Edge cases
- ✅ API compatibility (municipio naming preserved)

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
   - Coverage report (≥90% threshold)
   - SonarCloud analysis
   - Lint checks

2. **e2e-tests.yml**: Runs after deployment
   - E2E integration tests
   - Performance benchmarks
   - Health checks
   - Smoke tests

### Local CI Simulation

```bash
# Run full CI pipeline locally
make ci
```

This runs:
1. Clean
2. Install dependencies
3. Build (Linux/ARM64 for Lambda)
4. Unit tests with coverage
5. Lint

## Performance Testing

### Benchmarks

```go
func BenchmarkGeocodeByPostal(b *testing.B) {
    logger := logger.NewLogger("Benchmark")
    service := NewPostalCodeService(logger)
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
go test -bench=BenchmarkGeocodeByPostal -benchmem ./internal/application/
```

### Performance Goals

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| geocode-by-postal | <1ms | <1ms | ✅ |
| reverse-geocode | <20ms | ~10-20ms | ✅ |
| validate-postal | <1ms | <1ms | ✅ |
| validate-municipio | <1ms | <1ms | ✅ |
| autocomplete-postal | <5ms | <5ms | ✅ |
| autocomplete-municipio | <10ms | <10ms | ✅ |

**Note:** Times measured for in-memory operations (no I/O). Lambda cold start adds ~200-300ms.

## Troubleshooting

### Test Failures

```bash
# Run with verbose output
go test -v ./...

# Run specific failing test
go test -v -run TestName ./package/

# Check test coverage
make coverage-html

# Debug specific test
go test -v -run TestGeocodeByPostal ./internal/application/ -count=1
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

# Test with verbose output
cd test/e2e && npm run test -- --verbose
```

### Coverage Issues

```bash
# Generate detailed coverage report
make coverage-html

# Check coverage by package
go test -cover ./...

# Identify untested code
go tool cover -html=coverage.out

# Run coverage with threshold check
make coverage  # Fails if <90%
```

### Logger Issues

If you see logger-related test failures:

```bash
# Ensure logger is properly initialized in tests
logger := logger.NewLogger("TestContext")
service := application.NewPostalCodeService(logger)

# Check logger import path
import "github.com/pricofy/geocode-es/internal/shared/logger"
```

## Best Practices

### 1. Test Naming

```go
// Good
func TestGeocodeByPostal_ValidPostalCode_ReturnsCoordinates(t *testing.T)
func TestGeocodeByPostal_InvalidPostalCode_ReturnsError(t *testing.T)
func TestHandler_UnknownOperation_Returns400(t *testing.T)

// Bad
func TestGeocode(t *testing.T)
func Test1(t *testing.T)
func TestIt(t *testing.T)
```

### 2. Test Structure (AAA Pattern)

```go
func TestExample(t *testing.T) {
    // Arrange
    logger := logger.NewLogger("Test")
    service := NewService(logger)
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
        {"Empty postal code", "", false, true},
    }
    
    logger := logger.NewLogger("Test")
    service := NewPostalCodeService(logger)
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            event := domain.LambdaEvent{
                Body: fmt.Sprintf(`{"operation":"geocode-by-postal","postalCode":"%s"}`, tt.postalCode),
            }
            result, err := service.GeocodeByPostal(event)
            
            if tt.wantError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.wantSuccess, result.Success)
            }
        })
    }
}
```

### 4. Test Independence

- Each test should be independent
- No shared state between tests
- Use fresh instances (leverage DI)
- Clean up after tests
- Use `t.Parallel()` when tests are independent

### 5. Test Coverage

- Focus on business logic
- Test edge cases
- Test error paths
- Don't test trivial code (getters/setters)
- Test public APIs, not internal implementation

### 6. Dependency Injection in Tests

```go
// Good: Inject dependencies
func TestWithDI(t *testing.T) {
    logger := logger.NewLogger("Test")
    service := application.NewPostalCodeService(logger)
    // Test with injected dependencies
}

// Bad: Hard-coded dependencies
func TestWithoutDI(t *testing.T) {
    service := application.NewPostalCodeService(nil)
    // Harder to test, less flexible
}
```

### 7. Mock External Dependencies

```go
// When testing handlers, use real services for integration tests
func TestHandler_Integration(t *testing.T) {
    // Use real service
    response, err := handler.Handler(ctx, event)
    assert.NoError(t, err)
}

// When testing services, consider mocking providers for unit tests
func TestService_Unit(t *testing.T) {
    mockProvider := mocks.NewMockProvider()
    service := NewServiceWithProvider(mockProvider)
    // Test with mock
}
```

## Test Maintenance

### When to Update Tests

1. **After code changes**: Always update tests when changing business logic
2. **When adding features**: Write tests first (TDD) or immediately after
3. **When fixing bugs**: Add regression tests
4. **When refactoring**: Ensure tests still pass and cover new structure

### Test Debt

Avoid test debt by:
- Writing tests as you code
- Maintaining ≥90% coverage
- Reviewing test quality in PRs
- Refactoring tests alongside code
- Deleting obsolete tests

### Test Documentation

- Use descriptive test names
- Add comments for complex test scenarios
- Document test data sources
- Explain non-obvious assertions

---

**Last Updated:** November 2025  
**Version:** 2.0.0 (Expanded with DI, coverage goals, and E2E details)


