# Spanish Postal Codes Database

## Overview

Static database of **11,150 unique Spanish postal codes** from GeoNames.

- **Source**: GeoNames (http://www.geonames.org/)
- **Format**: JSON
- **Size**: ~1.5MB
- **Location**: `internal/infrastructure/provider/postal-codes-es.json`
- **Embedded**: Yes (compiled into binary)

## Data Structure

```json
{
  "28001": {
    "lat": 40.4168,
    "lon": -3.7038,
    "municipio": "Madrid",
    "provincia": "Madrid"
  },
  "08001": {
    "lat": 41.3851,
    "lon": 2.1734,
    "municipio": "Barcelona",
    "provincia": "Barcelona"
  }
}
```

### Fields

- `lat`: Latitude (decimal degrees)
- `lon`: Longitude (decimal degrees)
- `municipio`: Municipality name
- `provincia`: Province name

## Coverage

- **Total postal codes**: 11,150
- **Provinces**: 52 (all Spanish provinces)
- **Range**: 01000 - 52999
- **Accuracy**: Centroid of postal code area (±500m typical)

## In-Memory Indices

### 1. Postal Code Map
```go
codes map[string]PostalData
```
- **Purpose**: O(1) lookup by postal code
- **Size**: 11,150 entries
- **Usage**: `geocode-by-postal`, `validate-postal`

### 2. Municipality Index
```go
municipioIndex map[string][]postalEntry
```
- **Purpose**: O(1) lookup by municipality name
- **Size**: ~8,000 unique municipalities
- **Usage**: `geocode-by-postal` (when municipio provided)

### 3. Municipality Set
```go
municipioSet map[string]bool
```
- **Purpose**: O(1) validation
- **Size**: ~8,000 entries
- **Usage**: `validate-municipio`

### 4. Sorted Postal Codes
```go
sortedPostalCodes []string
```
- **Purpose**: Binary search for autocomplete
- **Size**: 11,150 entries (sorted)
- **Usage**: `autocomplete-postal`

### 5. All Postal Codes Array
```go
allPostalCodes []postalEntry
```
- **Purpose**: Linear scan for reverse geocode
- **Size**: 11,150 entries
- **Usage**: `reverse-geocode` (Haversine distance)

## Performance

| Operation | Index Used | Complexity | Latency |
|-----------|-----------|------------|---------|
| Lookup by postal code | Postal Code Map | O(1) | <1ms |
| Lookup by municipality | Municipality Index | O(1) | <1ms |
| Validate postal code | Postal Code Map | O(1) | <1ms |
| Validate municipality | Municipality Set | O(1) | <1ms |
| Autocomplete postal | Sorted Array | O(log n) | <5ms |
| Autocomplete municipio | Municipality Index | O(n) | <10ms |
| Reverse geocode | All Postal Codes | O(n) | ~10-20ms |

## Data Loading

### Cold Start

```go
func NewPostalCodeProvider() *PostalCodeProvider {
    // Load embedded JSON
    data := loadEmbeddedPostalCodes()
    
    // Build indices
    codes := buildPostalCodeMap(data)
    municipioIndex := buildMunicipioIndex(data)
    municipioSet := buildMunicipioSet(data)
    sortedPostalCodes := buildSortedArray(data)
    allPostalCodes := buildAllPostalCodesArray(data)
    
    return &PostalCodeProvider{
        codes:              codes,
        municipioIndex:     municipioIndex,
        municipioSet:       municipioSet,
        sortedPostalCodes:  sortedPostalCodes,
        allPostalCodes:     allPostalCodes,
    }
}
```

**Cold start time**: ~200ms (loading + indexing)

### Memory Usage

- Raw JSON: ~1.5MB
- In-memory indices: ~3-4MB total
- Lambda memory: 128MB (plenty of headroom)

## Updating Data

### When to Update

- GeoNames releases quarterly updates
- New postal codes added
- Coordinates corrected
- Municipality names changed

### How to Update

1. **Download latest data:**
```bash
curl -O http://download.geonames.org/export/zip/ES.zip
unzip ES.zip
```

2. **Convert to JSON:**
```bash
# Use conversion script (if exists)
node scripts/convert-postal-codes.js ES.txt > postal-codes-es.json
```

3. **Replace file:**
```bash
cp postal-codes-es.json internal/infrastructure/provider/
```

4. **Test:**
```bash
make test
```

5. **Deploy:**
```bash
make deploy ENV=dev
```

### Data Format (GeoNames)

GeoNames format (tab-separated):
```
country code      : iso country code, 2 characters
postal code       : varchar(20)
place name        : varchar(180)
admin name1       : 1. order subdivision (state) varchar(100)
admin code1       : 1. order subdivision (state) varchar(20)
admin name2       : 2. order subdivision (county/province) varchar(100)
admin code2       : 2. order subdivision (county/province) varchar(20)
admin name3       : 3. order subdivision (community) varchar(100)
admin code3       : 3. order subdivision (community) varchar(20)
latitude          : estimated latitude (wgs84)
longitude         : estimated longitude (wgs84)
accuracy          : accuracy of lat/lng from 1=estimated to 6=centroid
```

## Data Quality

### Accuracy

- **Postal code centroids**: ±500m typical
- **Municipality centroids**: ±2-5km
- **Rural areas**: ±5-10km (larger postal code areas)

### Validation

```bash
# Check data integrity
go test ./internal/infrastructure/provider/ -v

# Verify postal code count
jq 'length' internal/infrastructure/provider/postal-codes-es.json
# Should output: 11150

# Check for duplicates
jq 'keys | group_by(.) | map(select(length > 1))' postal-codes-es.json
# Should output: []
```

### Known Limitations

1. **Centroid-based**: Coordinates are centroids, not exact addresses
2. **No street-level**: Only postal code level precision
3. **Static data**: No real-time updates
4. **Spain only**: No support for other countries

## Alternative Data Sources

### 1. INE (Instituto Nacional de Estadística)
- Official Spanish statistics institute
- More accurate but more complex format
- Requires preprocessing

### 2. Correos (Spanish Postal Service)
- Most accurate postal code data
- Not freely available
- Requires license

### 3. OpenStreetMap
- Community-maintained
- Good coverage but variable quality
- Requires significant preprocessing

## Benefits of Static Database

✅ **No external API calls**: Zero latency, no rate limits
✅ **No cost per request**: Unlimited requests
✅ **Offline operation**: No internet dependency
✅ **Predictable performance**: Consistent latency
✅ **Simple deployment**: No database to manage
✅ **High availability**: No external service dependency

## Trade-offs

⚠️ **Static data**: Requires manual updates
⚠️ **Memory footprint**: 3-4MB in memory
⚠️ **Cold start**: ~200ms to load and index
⚠️ **Limited accuracy**: Centroid-based coordinates
⚠️ **Spain only**: No support for other countries

---

**Last Updated:** November 2025  
**Version:** 1.0.0  
**Data Source**: GeoNames  
**Total Postal Codes**: 11,150

