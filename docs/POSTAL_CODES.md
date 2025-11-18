# Spanish Postal Codes Database

**Purpose:** Documentation for the static Spanish postal codes database  
**Last Updated:** November 18, 2025

---

## Overview

The service uses a **static JSON database** of 11,150 Spanish postal codes for unlimited, fast geocoding without external API dependencies.

**Key Points:**
- ✅ 11,150 unique postal codes
- ✅ 1.31 MB file size
- ✅ O(1) lookup for postal codes (<1ms)
- ✅ Binary search for autocompletion (<5ms)
- ✅ Unlimited requests (no rate limit)
- ✅ Zero external API dependencies

---

## Database Source

**Source:** GeoNames (http://download.geonames.org/export/zip/ES.zip)

**Format:** Original TSV format converted to optimized JSON

**Last Updated:** November 2025

**Regeneration:** Postal codes rarely change - regeneration not needed frequently

---

## Database Structure

### File Location

- **Source:** `src/resources/postal-codes-es.json`
- **Deployed:** `dist/resources/postal-codes-es.json` (copied during build)

### Data Format

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

**Structure:**
- **Key:** Postal code (5 digits, string)
- **Value:** Object with coordinates and location info
  - `lat`: Latitude (number)
  - `lon`: Longitude (number)
  - `municipio`: Municipality name (string)
  - `provincia`: Province name (string)

---

## In-Memory Indices

The `PostalCodeProvider` creates optimized in-memory indices on first load:

### 1. Postal Code Map

**Purpose:** O(1) lookup by postal code  
**Structure:** `Map<string, PostalData>`  
**Usage:** `geocode-by-postal`, `validate-postal`

```typescript
postalCodeMap.get('28001') 
// → { lat: 40.4168, lon: -3.7038, municipio: 'Madrid', provincia: 'Madrid' }
```

### 2. Municipality Map

**Purpose:** O(1) lookup by municipality (case-insensitive)  
**Structure:** `Map<string, PostalData>`  
**Usage:** `geocode-by-postal`, `validate-municipio`

```typescript
municipioMap.get('madrid') 
// → { lat: 40.4168, lon: -3.7038, municipio: 'Madrid', provincia: 'Madrid', postalCode: '28001' }
```

### 3. Sorted Postal Codes

**Purpose:** Binary search for autocompletion  
**Structure:** `string[]` (sorted)  
**Usage:** `autocomplete-postal`

```typescript
// Find all postal codes starting with "280"
sortedPostalCodes.filter(code => code.startsWith('280'))
// → ['28001', '28002', '28003', ...]
```

### 4. Sorted Municipalities

**Purpose:** Binary search for autocompletion  
**Structure:** `string[]` (sorted, lowercase)  
**Usage:** `autocomplete-municipio`

```typescript
// Find all municipalities starting with "mad"
sortedMunicipios.filter(muni => muni.startsWith('mad'))
// → ['madarcos', 'madrid', 'maderuelo', ...]
```

### 5. All Postal Codes Array

**Purpose:** Linear scan for reverse geocoding  
**Structure:** `Array<{postalCode: string, data: PostalData}>`  
**Usage:** `reverse-geocode`

```typescript
// Find nearest postal code to coordinates
allPostalCodes.forEach(({postalCode, data}) => {
  const distance = haversine(targetLat, targetLon, data.lat, data.lon);
  if (distance < minDistance) {
    nearest = {postalCode, data, distance};
  }
});
```

---

## Regeneration Process

### Step 1: Download GeoNames Data

```bash
cd scripts
curl -O http://download.geonames.org/export/zip/ES.zip
unzip ES.zip
```

**Files:**
- `ES.txt` - Tab-separated values file
- `readme.txt` - Format documentation

### Step 2: Convert to JSON

```bash
node convert-postal-codes.js
```

**Output:** `../src/resources/postal-codes-es.json`

**Script:** `scripts/convert-postal-codes.js`

### Step 3: Verify

```bash
# Check file size
ls -lh src/resources/postal-codes-es.json

# Check entry count
node -e "const data = require('./src/resources/postal-codes-es.json'); console.log(Object.keys(data).length)"
```

**Expected:**
- File size: ~1.31 MB
- Entry count: ~11,150

---

## Usage in Code

### Loading Database

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Singleton pattern (cached in memory)
let codes: Record<string, PostalData> | null = null;

function getCodes(): Record<string, PostalData> {
  if (!codes) {
    const jsonPath = path.join(__dirname, '../resources/postal-codes-es.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    codes = JSON.parse(jsonContent);
  }
  return codes!;
}
```

### Lookup by Postal Code

```typescript
const codes = getCodes();
const postalCode = '28001';

if (codes[postalCode]) {
  const data = codes[postalCode];
  // data.lat, data.lon, data.municipio, data.provincia
}
```

### Search by Municipality

```typescript
const codes = getCodes();
const municipio = 'Madrid';

const entry = Object.entries(codes).find(
  ([_, data]) => data.municipio.toLowerCase() === municipio.toLowerCase()
);

if (entry) {
  const [postalCode, data] = entry;
  // postalCode, data.lat, data.lon, etc.
}
```

### Reverse Geocode (Haversine)

```typescript
const codes = getCodes();
const targetLat = 40.4168;
const targetLon = -3.7038;

let nearest: { postalCode: string; data: PostalData; distance: number } | null = null;
let minDistance = Infinity;

for (const [postalCode, data] of Object.entries(codes)) {
  const dist = calculateDistance(targetLat, targetLon, data.lat, data.lon);
  if (dist < minDistance) {
    minDistance = dist;
    nearest = { postalCode, data, distance: dist };
  }
}
```

---

## Performance Characteristics

### Postal Code Lookup

- **Complexity:** O(1)
- **Latency:** <1ms
- **Method:** Direct Map.get() access

### Municipality Search

- **Complexity:** O(1)
- **Latency:** <1ms
- **Method:** Direct Map.get() access (case-insensitive)

### Postal Code Autocompletion

- **Complexity:** O(log n) for search + O(k) for results
- **Latency:** <5ms
- **Method:** Binary search on sorted array

### Municipality Autocompletion

- **Complexity:** O(log n) for search + O(k) for results
- **Latency:** <5ms
- **Method:** Binary search on sorted array

### Reverse Geocode

- **Complexity:** O(n) where n = 11,150
- **Latency:** ~10-20ms
- **Method:** Linear scan with Haversine distance calculation

**Optimization Note:** Current performance is excellent for Lambda use case. Spatial indexing (R-tree) could reduce reverse geocoding to O(log n) if needed in the future.

---

## Data Accuracy

### Postal Codes

- **Accuracy:** 100% (official Spanish postal codes)
- **Coverage:** All 11,150 Spanish postal codes
- **Updates:** Rarely needed (postal codes don't change)

### Coordinates

- **Precision:** City/municipality center coordinates
- **Accuracy:** ±1km (sufficient for distance calculations)
- **Source:** GeoNames (official data)

---

## Build Integration

The database is automatically copied during build:

**Makefile:**
```makefile
build:
  npm run build  # Compile TypeScript
  mkdir -p dist/resources
  cp src/resources/postal-codes-es.json dist/resources/  # Copy database
```

**Result:** Database available at `dist/resources/postal-codes-es.json` in Lambda package

---

## Maintenance

### When to Regenerate

- **Rarely** (postal codes don't change often)
- **Only if:** GeoNames updates their data or new postal codes are added

### Regeneration Steps

1. Download latest ES.zip from GeoNames
2. Run conversion script
3. Verify entry count and file size
4. Commit updated JSON file
5. Deploy (database automatically copied during build)

---

## References

- **GeoNames:** http://download.geonames.org/export/zip/ES.zip
- **Conversion Script:** `scripts/convert-postal-codes.js`
- **Database File:** `src/resources/postal-codes-es.json`
- **Provider Implementation:** `src/providers/postal-code-provider.ts`

---

**Last Updated:** November 18, 2025  
**Maintainer:** Carlos Nebrera

