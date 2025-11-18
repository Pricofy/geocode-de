# Spanish Postal Codes Conversion Script

This directory contains the script to convert GeoNames postal codes data to JSON format.

## Files

- **convert-postal-codes.js** - Conversion script (committed)
- **ES.txt** - GeoNames data (downloaded, not committed)
- **ES.zip** - Downloaded archive (not committed)

## Purpose

Generates `../src/resources/postal-codes-es.json` with 11,150 Spanish postal codes.

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

```bash
cd scripts

# 1. Download GeoNames Spanish postal codes
curl -O http://download.geonames.org/export/zip/ES.zip
unzip ES.zip

# 2. Convert to JSON
node convert-postal-codes.js

# Output: ../src/resources/postal-codes-es.json
# Size: ~1.31 MB
# Entries: 11,150 unique postal codes
```

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

**Runtime (Lambda):**
- Load time: ~50ms (first cold start)
- Lookup time: <1ms (postal code), ~5ms (municipio)
- Memory: 512MB Lambda

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

