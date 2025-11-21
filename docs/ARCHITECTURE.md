# Architecture

## High-Level Design

Hexagonal Architecture (Ports & Adapters) with clean separation of concerns across three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Entry Point (Handler)                         │
│                    cmd/lambda/main.go                            │
│  - App struct with DI                                            │
│  - Global app instance (cold start optimization)                │
│  - Operation routing                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Layer                              │
│                   (internal/application/)                        │
│                                                                  │
│  - PostalCodeService: Business logic orchestration              │
│  - Operations: geocode-by-postal, reverse-geocode, validate x2, │
│                autocomplete x2                                   │
│  - Input validation and parsing                                 │
│  - Error handling and logging                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Infrastructure Layer                                │
│              (internal/infrastructure/)                          │
│                                                                  │
│  Provider:                                                       │
│  - PostalCodeProvider: Static postal codes database             │
│  - In-memory indices for O(1) lookups                           │
│  - Haversine distance calculation                               │
│                                                                  │
│  Handler:                                                        │
│  - Lambda event parsing                                         │
│  - Response formatting                                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Domain Layer                                   │
│                   (internal/domain/)                             │
│                                                                  │
│  - Models: Request/Response structs                             │
│  - Errors: Custom error types                                   │
│  - Constants: Configuration values                              │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Shared Utilities                               │
│                   (internal/shared/)                             │
│                                                                  │
│  - Logger: Structured CloudWatch logging                        │
└─────────────────────────────────────────────────────────────────┘
```

## Domain Layer (`internal/domain/`)

**Pure business models, no dependencies:**

- `models.go`: Request/response structs, postal data models
- `errors.go`: Custom error types (LocationError hierarchy)
- `constants.go`: Configuration constants (limits, regex patterns)

**Key Models:**
- `PostalData`: Postal code entry with coordinates
- `GeocodingResult`: Geocoding operation result
- `ReverseGeocodingResult`: Reverse geocoding result
- `ValidationResult`: Validation operation result
- `AutocompleteResult`: Autocomplete operation result

## Application Layer (`internal/application/`)

**Use cases and orchestration:**

- `service.go`: PostalCodeService - main business logic
- `operations.go`: Operation handlers (if separated)

**PostalCodeService Methods:**
- `GeocodeByPostal()`: Postal code → coordinates
- `ReverseGeocode()`: Coordinates → postal code
- `ValidatePostal()`: Check postal code exists
- `ValidateMunicipality()`: Check municipality exists
- `AutocompletePostal()`: Prefix-based postal code search
- `AutocompleteMunicipality()`: Fuzzy municipality search

## Infrastructure Layer (`internal/infrastructure/`)

**External integrations:**

### Provider (`provider/`)
- `postal_provider.go`: Static postal codes database
- `postal-codes-es.json`: 11,150 Spanish postal codes (embedded)

**In-Memory Indices:**
- Postal code map: O(1) lookup
- Municipality index: O(1) lookup
- Municipality set: O(1) validation
- Sorted postal codes: Binary search for autocomplete
- All postal codes array: Linear scan for reverse geocode

### Handler (`handler/`)
- `lambda_handler.go`: Lambda event parsing and routing

## Shared Utilities (`internal/shared/`)

**Cross-cutting concerns:**

### Logger (`logger/`)
- Structured JSON logging for CloudWatch Insights
- Log levels: DEBUG, INFO, WARN, ERROR
- Contextual metadata support

## Key Flows

### 1. Geocode by Postal Flow
```
Lambda Invoke → main.go Handler → PostalCodeService.GeocodeByPostal()
                                       ↓
                          Parse and validate input
                                       ↓
                          Try postal code lookup (O(1))
                                       ↓
                          If not found, try municipality (O(1))
                                       ↓
                          Return coordinates + metadata
```

### 2. Reverse Geocode Flow
```
Lambda Invoke → main.go Handler → PostalCodeService.ReverseGeocode()
                                       ↓
                          Validate coordinates
                                       ↓
                          Calculate Haversine distance to all postal codes (O(n))
                                       ↓
                          Find nearest postal code
                                       ↓
                          Return postal code + distance
```

### 3. Validation Flow
```
Lambda Invoke → main.go Handler → PostalCodeService.ValidatePostal/Municipality()
                                       ↓
                          Parse input
                                       ↓
                          O(1) lookup in index
                                       ↓
                          Return valid: true/false
```

### 4. Autocomplete Flow
```
Lambda Invoke → main.go Handler → PostalCodeService.Autocomplete*()
                                       ↓
                          Parse query and limit
                                       ↓
                          Binary search in sorted index (O(log n))
                                       ↓
                          Return up to limit results
```

### 5. Cold Start Flow
```
Lambda Init → init() in main.go
                    ↓
          Create PostalCodeService
                    ↓
          PostalCodeProvider loads postal-codes-es.json
                    ↓
          Build in-memory indices (11,150 entries)
                    ↓
          Create global App instance
                    ↓
          Ready for invocations (~200ms)
```

## Dependency Injection

### App Struct (cmd/lambda/main.go)
```go
type App struct {
    service *application.PostalCodeService
    logger  *logger.Logger
}

func NewApp() (*App, error) {
    service := application.NewPostalCodeService()
    appLogger := logger.NewLogger("GeocodeES")
    
    return &App{
        service: service,
        logger:  appLogger,
    }, nil
}

var globalApp *App

func init() {
    app, err := NewApp()
    if err != nil {
        panic(fmt.Sprintf("Failed to initialize: %v", err))
    }
    globalApp = app
}
```

**Benefits:**
- ✅ Testable without AWS Lambda runtime
- ✅ Explicit dependencies
- ✅ Cold start optimization (global app)
- ✅ Easy to mock for testing

## Data Structures

### In-Memory Indices

```go
type PostalCodeProvider struct {
    // O(1) lookup by postal code
    codes map[string]PostalData
    
    // O(1) lookup by municipality
    municipalityIndex map[string][]postalEntry
    
    // O(1) validation
    municipalitySet map[string]bool
    
    // Binary search for autocomplete
    sortedPostalCodes []string
    
    // Linear scan for reverse geocode
    allPostalCodes []postalEntry
}
```

### Performance Characteristics

| Operation | Data Structure | Complexity | Latency |
|-----------|---------------|------------|---------|
| Geocode by postal | Map lookup | O(1) | <1ms |
| Geocode by municipality | Map lookup | O(1) | <1ms |
| Reverse geocode | Linear scan + Haversine | O(n) | ~10-20ms |
| Validate postal | Map lookup | O(1) | <1ms |
| Validate municipality | Set lookup | O(1) | <1ms |
| Autocomplete postal | Binary search | O(log n) | <5ms |
| Autocomplete municipality | Linear scan | O(n) | <10ms |

## Error Handling

### Custom Error Types

```go
type LocationError struct {
    Message   string
    Timestamp time.Time
}

type InvalidCoordinatesError struct {
    LocationError
    Lat float64
    Lon float64
}

type PostalCodeNotFoundError struct {
    LocationError
    PostalCode string
    Municipality  string
}

type ValidationError struct {
    LocationError
    Field string
}
```

**Benefits:**
- Type-safe error handling
- Contextual error information
- Timestamps for debugging
- Consistent error responses

## Testing Strategy

### Unit Tests (co-located with code)
- `*_test.go` files in same package as code
- Test provider (data access)
- Test service (business logic)
- Test handler (Lambda routing)
- Test domain (models, errors)
- Test logger (structured logging)

### Integration Tests
- Test complete Lambda invocation flow
- Test all 6 operations end-to-end
- Test error scenarios

### E2E Tests (TypeScript)
- Test deployed Lambda via AWS SDK
- Test from consumer perspective
- Measure real-world latency
- Validate production behavior

## Performance Optimizations

### 1. In-Memory Data
- All 11,150 postal codes loaded at cold start
- No external API calls
- No database queries
- Sub-millisecond lookups

### 2. Efficient Indices
- Multiple indices for different access patterns
- Pre-sorted arrays for binary search
- Set-based validation for O(1) lookups

### 3. Cold Start Optimization
- Global app instance
- Single initialization
- Embedded postal codes (no file I/O)
- ~200ms cold start (3-5x faster than Node.js)

### 4. Memory Efficiency
- 128MB Lambda memory (50% reduction from Node.js)
- Compact data structures
- No unnecessary allocations

## Security Model

### Private Lambda Function
- No public endpoints (no API Gateway, no Function URLs)
- Only invokable via `lambda:InvokeFunction` permission
- pricofy-location-service has invoke permission via IAM role

### Data Privacy
- No PII stored
- Postal codes are public data
- No user tracking
- Stateless operations

## Monitoring & Observability

### Structured Logging
```go
logger.Info("PostalCodeService", "Geocoding completed", map[string]interface{}{
    "postalCode": "28001",
    "municipality":  "Madrid",
    "latency":    5,
    "source":     "postal_code",
})
```

### CloudWatch Metrics
- Invocations
- Duration (p50, p95, p99)
- Errors
- Throttles
- Concurrent executions

### CloudWatch Insights Queries
```sql
-- Find all errors
fields @timestamp, component, message, error
| filter level = "ERROR"
| sort @timestamp desc

-- Track geocoding success rate
fields @timestamp, component
| filter component = "PostalCodeService" and message like /successful/
| stats count() as successes by bin(5m)

-- Average latency
fields @timestamp, @duration
| filter @message like /Geocoding completed/
| stats avg(@duration) as avg_ms by bin(1h)
```

## Deployment Architecture

### AWS Lambda
- Runtime: PROVIDED_AL2023 (Go custom runtime)
- Architecture: ARM64 (Graviton2)
- Memory: 128MB
- Timeout: 10s
- Handler: `bootstrap`

### CDK Infrastructure
- Single Lambda function
- IAM role with CloudWatch Logs permissions
- CloudWatch Log Group (30 days retention)
- Exports: Function ARN and Name

### CI/CD Pipeline
- GitHub Actions workflows:
  - `deploy.yml`: Deployment to dev/prod
  - `quality.yml`: Tests + SonarCloud
  - `e2e-tests.yml`: E2E integration tests
- Automated testing before deployment
- OIDC authentication (no long-lived credentials)

## Future Enhancements

### Potential Improvements
1. **Additional Countries**: Add geocode-fr, geocode-pt, etc.
2. **Caching**: Add Redis cache for frequently accessed postal codes
3. **Batch Operations**: Support batch geocoding requests
4. **Geofencing**: Add proximity search (find postal codes within radius)
5. **Address Parsing**: Parse full addresses to extract postal codes
6. **Fuzzy Matching**: Improve municipality search with fuzzy matching

### Scalability Considerations
- Current: 11,150 postal codes fit in 128MB memory
- Spain only: No need for horizontal scaling
- If adding more countries: Consider separate Lambda per country
- If adding address parsing: Consider separate service

---

**Last Updated:** November 2025  
**Version:** 1.0.0

