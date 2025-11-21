# Dependency Injection Architecture

## Overview

The application uses **manual constructor-based dependency injection** (the idiomatic Go approach) to achieve 100% testability without external DI frameworks.

## Why Manual DI?

Go doesn't have built-in dependency injection. The alternatives are:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Manual DI** (current) | Zero overhead, explicit, type-safe, compile-time safety | Requires manual wiring | ✅ **Best for Lambda** |
| **Wire** (Google) | Code generation, zero runtime overhead | Extra build step, not dynamic | ⚠️ Good alternative |
| **Dig/Fx** (Uber) | Feature-rich, dynamic | Reflection overhead, runtime errors | ❌ Too heavy for Lambda |

## Architecture

### Before (Implicit Dependencies)

```go
// Hard to test - implicit dependencies
func Handler(ctx context.Context, event domain.LambdaEvent) (domain.LambdaResponse, error) {
    // Service created on every invocation
    service := application.NewPostalCodeService()
    
    // Parse operation
    var body domain.RequestBody
    json.Unmarshal([]byte(event.Body), &body)
    
    // Route to operation
    switch body.Operation {
    case "geocode-by-postal":
        return application.GeocodeByPostalOperation(service, event)
    // ...
    }
}
```

**Problems:**
- ❌ Service recreated on every invocation (inefficient)
- ❌ Can't inject mocks for testing
- ❌ Logger not shared across components
- ❌ Hard to test error scenarios
- ❌ No centralized initialization

### After (Constructor Injection with App Struct)

```go
// Testable - dependencies injected via App struct
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

func (a *App) HandleRequest(ctx context.Context, event domain.LambdaEvent) (domain.LambdaResponse, error) {
    // Parse operation
    var body domain.RequestBody
    if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
        return a.createErrorResponse(400, "Invalid JSON payload"), nil
    }
    
    // Route to operation-specific handler
    switch body.Operation {
    case "geocode-by-postal":
        return a.handleGeocodeByPostal(ctx, event)
    case "reverse-geocode":
        return a.handleReverseGeocode(ctx, event)
    // ...
    }
}
```

**Benefits:**
- ✅ Service initialized once (cold start), reused for warm invocations
- ✅ Easy to inject mocks: `&App{service: mockService, logger: mockLogger}`
- ✅ Shared logger across all components
- ✅ Test error scenarios with mock services
- ✅ Zero runtime overhead
- ✅ Type-safe - errors at compile time

## Dependency Flow

```
┌─────────────────────────────────────┐
│         cmd/main.go                 │
│  ┌───────────────────────────────┐  │
│  │  App (DI Container)           │  │
│  │  ├─ logger: *logger.Logger    │  │
│  │  └─ service: *PostalCodeSvc   │  │
│  └───────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  internal/application/service.go    │
│  ┌───────────────────────────────┐  │
│  │  PostalCodeService            │  │
│  │  ├─ provider: *Provider       │  │
│  │  └─ logger: *logger.Logger    │  │
│  └───────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  internal/infrastructure/provider/  │
│  ┌───────────────────────────────┐  │
│  │  PostalCodeProvider           │  │
│  │  ├─ codes: map[string]Data    │  │
│  │  ├─ municipioIndex: map[...]  │  │
│  │  └─ logger: *logger.Logger    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Key Points:**
1. **App struct** is the DI container at the entry point
2. **Logger** is injected from top to bottom
3. **Service** is initialized once and reused
4. **Provider** is initialized once with embedded data (`go:embed`)

## Testing Patterns

### Unit Testing (with Mocks)

```go
func TestApp_HandleRequest_GeocodeByPostal(t *testing.T) {
    // Create mock service
    mockService := &MockPostalCodeService{
        geocodeResult: domain.GeocodingResult{
            Success:    true,
            PostalCode: "28001",
            Municipio:  "Madrid",
            Provincia:  "Madrid",
            Coords:     domain.Coordinates{Lat: 40.4168, Lon: -3.7038},
            Source:     "postal",
        },
    }
    
    // Create mock logger
    mockLogger := logger.NewLogger("Test")
    
    // Inject mocks via App struct
    app := &App{
        service: mockService,
        logger:  mockLogger,
    }
    
    // Test with full control
    ctx := context.Background()
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    response, err := app.HandleRequest(ctx, event)
    
    assert.NoError(t, err)
    assert.Equal(t, 200, response.StatusCode)
    
    var body map[string]interface{}
    json.Unmarshal([]byte(response.Body), &body)
    assert.True(t, body["success"].(bool))
    assert.Equal(t, "Madrid", body["municipio"])
}
```

### Integration Testing (with Real Services)

```go
func TestApp_Integration(t *testing.T) {
    // Use real initialization
    app, err := NewApp()
    require.NoError(t, err)
    
    // Test end-to-end with real data
    ctx := context.Background()
    event := domain.LambdaEvent{
        Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
    }
    
    response, err := app.HandleRequest(ctx, event)
    
    assert.NoError(t, err)
    assert.Equal(t, 200, response.StatusCode)
    
    var body domain.GeocodingResult
    json.Unmarshal([]byte(response.Body), &body)
    assert.True(t, body.Success)
    assert.Equal(t, "Madrid", body.Municipio)
}
```

### Error Scenario Testing

```go
func TestApp_HandleRequest_InvalidJSON(t *testing.T) {
    app, _ := NewApp()
    ctx := context.Background()
    event := domain.LambdaEvent{
        Body: `{invalid json}`,
    }
    
    response, err := app.HandleRequest(ctx, event)
    
    assert.NoError(t, err) // Handler doesn't return error for user errors
    assert.Equal(t, 400, response.StatusCode)
    
    var body map[string]interface{}
    json.Unmarshal([]byte(response.Body), &body)
    assert.False(t, body["success"].(bool))
    assert.Contains(t, body["error"], "Invalid JSON")
}

func TestApp_HandleRequest_UnknownOperation(t *testing.T) {
    app, _ := NewApp()
    ctx := context.Background()
    event := domain.LambdaEvent{
        Body: `{"operation":"unknown-op"}`,
    }
    
    response, err := app.HandleRequest(ctx, event)
    
    assert.NoError(t, err)
    assert.Equal(t, 400, response.StatusCode)
    
    var body map[string]interface{}
    json.Unmarshal([]byte(response.Body), &body)
    assert.False(t, body["success"].(bool))
    assert.Contains(t, body["error"], "not supported")
}
```

## Lambda Compatibility

The architecture maintains Lambda cold start optimization:

```go
// Global instance for warm invocations (initialized once)
var globalApp *App

func init() {
    app, err := NewApp()
    if err != nil {
        panic(fmt.Sprintf("Failed to initialize app: %v", err))
    }
    globalApp = app
}

func main() {
    awslambda.Start(func(ctx context.Context, event domain.LambdaEvent) (domain.LambdaResponse, error) {
        return globalApp.HandleRequest(ctx, event)
    })
}
```

**Performance:**
- ✅ Same cold start time (initialization happens once in `init()`)
- ✅ Warm invocations reuse the same `globalApp` instance
- ✅ No runtime reflection overhead
- ✅ Embedded data (`go:embed`) loaded once, not per invocation
- ✅ In-memory indices built once during cold start

**Cold Start Breakdown:**
1. **Go runtime initialization:** ~50-100ms
2. **App initialization (NewApp):**
   - Logger creation: ~1ms
   - Service creation: ~1ms
   - Provider initialization: ~5-10ms (load embedded JSON, build indices)
3. **Total cold start:** ~200-300ms (typical for Go Lambda)

**Warm Invocation:**
- **Latency:** <1ms (geocode-by-postal, validate)
- **Latency:** ~10-20ms (reverse-geocode with distance calculations)

## Operation-Specific Handlers

Each operation has its own handler method in the App struct:

```go
func (a *App) handleGeocodeByPostal(ctx context.Context, event domain.LambdaEvent) (domain.LambdaResponse, error) {
    result, err := a.service.GeocodeByPostal(event)
    if err != nil {
        return a.createErrorResponse(400, err.Error()), nil
    }
    return a.createSuccessResponse(result), nil
}

func (a *App) handleReverseGeocode(ctx context.Context, event domain.LambdaEvent) (domain.LambdaResponse, error) {
    result, err := a.service.ReverseGeocode(event)
    if err != nil {
        return a.createErrorResponse(400, err.Error()), nil
    }
    return a.createSuccessResponse(result), nil
}

// ... similar for validate-postal, validate-municipio, autocomplete-postal, autocomplete-municipio
```

**Benefits:**
- Clear separation of concerns
- Easy to test each operation independently
- Consistent error handling
- Type-safe response formatting

## Migration Path to Wire (Optional)

If complexity grows (e.g., adding external API clients, database connections), Wire can automate the wiring:

```go
//go:build wireinject
// +build wireinject

package main

import (
    "github.com/google/wire"
    "github.com/pricofy/geocode-es/internal/application"
    "github.com/pricofy/geocode-es/internal/shared/logger"
)

func InitializeApp() (*App, error) {
    wire.Build(
        logger.NewLogger,
        application.NewPostalCodeService,
        NewApp,
    )
    return nil, nil
}
```

Then in `init()`:
```go
func init() {
    globalApp, err := InitializeApp()
    if err != nil {
        panic(err)
    }
}
```

**When to Consider Wire:**
- More than 5-6 dependencies
- Complex dependency graphs
- Multiple configuration sources (SSM, Secrets Manager, etc.)
- External API clients with connection pooling

**Current Status:** Manual DI is sufficient for the current architecture (simple, fast, explicit).

## Testing Guidelines

### DO:
- ✅ Inject mock services for unit tests
- ✅ Use real App initialization for integration tests
- ✅ Test error scenarios with invalid inputs
- ✅ Test all 6 operations independently
- ✅ Verify App can handle multiple requests (concurrency)
- ✅ Test both direct Lambda invocation and API Gateway proxy events

### DON'T:
- ❌ Use global variables in tests (except for table-driven tests)
- ❌ Share App instances between tests (create new instances)
- ❌ Mock the App itself (mock its dependencies instead)
- ❌ Skip testing error paths
- ❌ Ignore edge cases (empty strings, nil pointers, etc.)

## Examples

See:
- `cmd/main_test.go` - Unit tests with real App initialization
- `internal/application/service_test.go` - Service tests with real provider
- `internal/infrastructure/handler/lambda_handler_test.go` - Handler integration tests
- `test/e2e/` - E2E tests against deployed Lambda

## Comparison with ai-service

| Aspect | ai-service | geocode-es |
|--------|------------|------------|
| **DI Container** | App struct | App struct ✅ |
| **Logger** | Shared logger | Shared logger ✅ |
| **External Deps** | ConfigService (SSM), multiple AI providers | None (embedded data) |
| **Complexity** | High (multi-provider, fallback chains) | Low (single provider, static data) |
| **Wire Candidate** | Yes (many dependencies) | No (simple DI) |
| **Cold Start** | ~300-500ms (SSM fetch, HTTP clients) | ~200-300ms (embedded data) |

**Key Difference:** `geocode-es` has simpler DI because it doesn't depend on external services (no SSM, no API clients). All data is embedded via `go:embed`, making it faster and easier to test.

## References

- [Go Blog: Dependency Injection](https://go.dev/blog/wire)
- [Google Wire](https://github.com/google/wire)
- [Practical Go: DI without frameworks](https://www.youtube.com/watch?v=4Hn7P2A_nF4)
- [Hexagonal Architecture in Go](https://medium.com/@matiasvarela/hexagonal-architecture-in-go-cfd4e436faa3)

---

**Last Updated:** November 2025  
**Version:** 1.0.0



