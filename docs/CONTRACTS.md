# API Contracts

Complete request/response specifications for all 6 operations.

## Invocation Method

**AWS Lambda SDK** (Direct Invoke) - **NOT HTTP/REST**

```typescript
const lambda = new Lambda();
const result = await lambda.invoke({
  FunctionName: 'pricofy-geocode-es-dev',
  Payload: JSON.stringify({ body: JSON.stringify(request) })
}).promise();
```

## Common Request Format

All requests are wrapped in Lambda event format:

```json
{
  "body": "{\"operation\":\"...\", ...}"
}
```

## Common Response Format

```json
{
  "statusCode": 200,
  "body": "{\"success\":true, ...}"
}
```

---

## 1. Geocode by Postal

Convert Spanish postal code or municipality to coordinates.

### Request (by postal code)

```json
{
  "operation": "geocode-by-postal",
  "postalCode": "28001"
}
```

### Request (by municipality)

```json
{
  "operation": "geocode-by-postal",
  "municipality": "Madrid"
}
```

### Response (Success)

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "coords": {
      "lat": 40.4168,
      "lon": -3.7038
    },
    "municipality": "Madrid",
    "province": "Madrid",
    "postalCode": "28001",
    "source": "postal_code"
  }
}
```

### Response (Not Found)

```json
{
  "statusCode": 404,
  "body": {
    "success": false,
    "error": "Postal code not found: 99999"
  }
}
```

### Fields

- `source`: `"postal_code"` (looked up by postal code) or `"municipality"` (looked up by municipality)

---

## 2. Reverse Geocode

Find nearest Spanish postal code from GPS coordinates.

### Request

```json
{
  "operation": "reverse-geocode",
  "lat": 40.4168,
  "lon": -3.7038
}
```

### Response (Success)

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "city": "Madrid",
    "postalCode": "28001",
    "province": "Madrid",
    "country": "España",
    "coords": {
      "lat": 40.4168,
      "lon": -3.7038
    },
    "distance": 0.142
  }
}
```

### Response (Invalid Coordinates)

```json
{
  "statusCode": 400,
  "body": {
    "success": false,
    "error": "Invalid coordinates: lat=999, lon=999"
  }
}
```

### Fields

- `distance`: Distance to nearest postal code centroid in kilometers (rounded to 3 decimals)

---

## 3. Validate Postal

Check if Spanish postal code exists.

### Request

```json
{
  "operation": "validate-postal",
  "postalCode": "28001"
}
```

### Response

```json
{
  "statusCode": 200,
  "body": {
    "valid": true,
    "value": "28001"
  }
}
```

---

## 4. Validate Municipality

Check if Spanish municipality exists.

### Request

```json
{
  "operation": "validate-municipality",
  "municipality": "Madrid"
}
```

### Response

```json
{
  "statusCode": 200,
  "body": {
    "valid": true,
    "value": "Madrid"
  }
}
```

---

## 5. Autocomplete Postal

Autocomplete Spanish postal codes by prefix.

### Request

```json
{
  "operation": "autocomplete-postal",
  "prefix": "280",
  "limit": 10
}
```

### Response

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "results": [
      {
        "postalCode": "28001",
        "municipality": "Madrid",
        "province": "Madrid"
      },
      {
        "postalCode": "28002",
        "municipality": "Madrid",
        "province": "Madrid"
      }
    ]
  }
}
```

### Fields

- `limit`: Maximum results (default: 10, max: 50)

---

## 6. Autocomplete Municipality

Autocomplete Spanish municipalities by query (fuzzy search).

### Request

```json
{
  "operation": "autocomplete-municipality",
  "query": "mad",
  "limit": 10
}
```

### Response

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "results": [
      {
        "postalCode": "28001",
        "municipality": "Madrid",
        "province": "Madrid"
      },
      {
        "postalCode": "28730",
        "municipality": "Madarcos",
        "province": "Madrid"
      }
    ]
  }
}
```

### Fields

- `limit`: Maximum results (default: 10, max: 50)

---

## Error Responses

### Validation Error (400)

```json
{
  "statusCode": 400,
  "body": {
    "success": false,
    "error": "Invalid postal code format: expected 5 digits"
  }
}
```

### Not Found (404)

```json
{
  "statusCode": 404,
  "body": {
    "success": false,
    "error": "Postal code not found: 99999"
  }
}
```

### Internal Error (500)

```json
{
  "statusCode": 500,
  "body": {
    "success": false,
    "error": "Internal server error"
  }
}
```

---

## Performance Benchmarks

| Operation | Complexity | Typical Latency |
|-----------|------------|-----------------|
| geocode-by-postal | O(1) | <1ms |
| reverse-geocode | O(n) | ~10-20ms |
| validate-postal | O(1) | <1ms |
| validate-municipality | O(1) | <1ms |
| autocomplete-postal | O(log n) | <5ms |
| autocomplete-municipality | O(n) | <10ms |

---

**Last Updated:** November 2025  
**Version:** 1.0.0

