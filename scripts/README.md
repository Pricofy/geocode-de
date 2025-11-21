# Spanish Postal Codes Conversion Script

This directory contains the script to convert GeoNames postal codes data to JSON format.

## Files

- **ES.txt** - GeoNames data (downloaded, not committed)
- **ES.zip** - Downloaded archive (not committed)

**Note:** The conversion script (`convert-postal-codes.js`) was removed during the migration to Go. The postal codes database is now embedded in the Go binary via `//go:embed`.

## Purpose

The postal codes database (`postal-codes-es.json`) is embedded in the Go binary at compile time. This directory contains the original GeoNames data for reference and potential future updates.

Used by:
- `geocode-by-postal` operation - Forward geocoding (postal code/city → coords)
- `reverse-geocode` operation - Reverse geocoding (GPS coords → nearest postal code)
- `validate-postal` operation - Validate if postal code exists
- `validate-municipio` operation - Validate if municipality exists
- `autocomplete-postal` operation - Autocomplete postal codes
- `autocomplete-municipio` operation - Autocomplete municipalities

## Usage

### First Time (Already Done)

The postal-codes-es.json file is **already generated and committed** to git.

You **don't need to run this** unless:
- Updating postal codes data (GeoNames releases new version)
- Regenerating after corruption
- Adding more countries

### Regenerate (if needed)

**Note:** With the Go implementation, the postal codes database is embedded in the binary. To update:

1. Download and convert GeoNames data (requires Node.js script or manual conversion)
2. Update `internal/infrastructure/provider/postal-codes-es.json`
3. Rebuild the Go binary: `make build`

The embedded file is located at: `internal/infrastructure/provider/postal-codes-es.json`

**Size:** ~1.31 MB  
**Entries:** 11,150 unique postal codes

## Data Source

**Source:** GeoNames  
**URL:** http://download.geonames.org/export/zip/  
**License:** Creative Commons Attribution 4.0  
**Format:** Tab-separated values (TSV)

**Columns:**
```
0: country code (ES)
1: postal code (28001)
2: place name (Madrid)
3: admin name 1 (Comunidad de Madrid)
9: latitude (40.4168)
10: longitude (-3.7038)
```

## Output Format

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

## Performance

**Conversion:**
- Input: 37,867 lines (with duplicates)
- Output: 11,150 unique postal codes
- Time: ~2 seconds
- Size: 1.31 MB

**Runtime (Lambda - Go):**
- Load time: ~50ms (first cold start, data embedded in binary)
- Lookup time: <1ms (postal code), ~5ms (municipio)
- Memory: 128MB Lambda (50% reduction from Node.js)
- Cold start: ~200ms (3-5x faster than Node.js ~500ms)

## Maintenance

**Frequency:** Rarely (postal codes don't change often)

**When to update:**
- New municipalities created in Spain
- Postal code boundaries changed
- GeoNames data improved

**Last updated:** November 18, 2025

## Notes

- Duplicates are skipped (takes first occurrence)
- Only Spanish (ES) postal codes included
- Coordinates are approximate (±1km precision)
- Sufficient for distance calculations (error negligible for distances >50km)

---

**Don't run unless regenerating data**

