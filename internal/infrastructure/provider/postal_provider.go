package provider

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"

	"github.com/pricofy/geocode-es/internal/domain"
	"github.com/pricofy/geocode-es/internal/infrastructure/logger"
)

//go:embed postal-codes-es.json
var postalCodesJSON []byte

// PostalCodeProvider provides access to Spanish postal code data.
// Implements lazy loading with sync.Once to ensure single initialization.
// Builds optimized indices for O(1) lookups and fast autocomplete.
type PostalCodeProvider struct {
	codes              map[string]domain.PostalData
	municipioIndex     map[string][]postalEntry
	municipioSet       map[string]bool
	sortedPostalCodes  []string
	initOnce           sync.Once
}

// postalEntry represents a postal code entry in the municipio index.
type postalEntry struct {
	PostalCode string
	Data       domain.PostalData
}

// NewPostalCodeProvider creates a new PostalCodeProvider instance.
// The database is loaded lazily on first access.
func NewPostalCodeProvider() *PostalCodeProvider {
	return &PostalCodeProvider{}
}

// getCodes loads the postal codes database and builds indices if not already loaded.
// Uses sync.Once to ensure thread-safe single initialization.
func (p *PostalCodeProvider) getCodes() map[string]domain.PostalData {
	p.initOnce.Do(func() {
		var codes map[string]domain.PostalData
		if err := json.Unmarshal(postalCodesJSON, &codes); err != nil {
			logger.Error("PostalCodeProvider", "Failed to parse postal codes JSON", err, nil)
			panic(fmt.Sprintf("Failed to load postal codes database: %v", err))
		}

		p.codes = codes
		p.buildIndexes(codes)

		logger.Info("PostalCodeProvider", "Loaded postal codes database with indexes", map[string]interface{}{
			"totalPostalCodes": len(codes),
			"uniqueMunicipios": len(p.municipioSet),
		})
	})

	return p.codes
}

// buildIndexes builds optimized indices for fast lookups:
// - municipioIndex: map of lowercase municipio → []postalEntry
// - municipioSet: set of lowercase municipio names for O(1) validation
// - sortedPostalCodes: sorted array for binary search autocomplete
func (p *PostalCodeProvider) buildIndexes(codes map[string]domain.PostalData) {
	p.municipioIndex = make(map[string][]postalEntry)
	p.municipioSet = make(map[string]bool)
	p.sortedPostalCodes = make([]string, 0, len(codes))

	for postalCode, data := range codes {
		municipioKey := strings.ToLower(strings.TrimSpace(data.Municipio))
		p.municipioSet[municipioKey] = true

		if p.municipioIndex[municipioKey] == nil {
			p.municipioIndex[municipioKey] = make([]postalEntry, 0)
		}
		p.municipioIndex[municipioKey] = append(p.municipioIndex[municipioKey], postalEntry{
			PostalCode: postalCode,
			Data:       data,
		})

		p.sortedPostalCodes = append(p.sortedPostalCodes, postalCode)
	}

	sort.Strings(p.sortedPostalCodes)

	logger.Debug("PostalCodeProvider", "Built indexes", map[string]interface{}{
		"municipioIndexSize":    len(p.municipioIndex),
		"municipioSetSize":      len(p.municipioSet),
		"sortedPostalCodesLength": len(p.sortedPostalCodes),
	})
}

// calculateDistance calculates the great-circle distance between two points on Earth
// using the Haversine formula.
//
// The Haversine formula determines the great-circle distance between two points
// on a sphere given their longitudes and latitudes. This is the shortest distance
// over the Earth's surface, ignoring terrain.
//
// Parameters:
//   - lat1, lon1: Coordinates of the first point (in degrees)
//   - lat2, lon2: Coordinates of the second point (in degrees)
//
// Returns:
//   - Distance in kilometers between the two points
func (p *PostalCodeProvider) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = domain.EARTH_RADIUS_KM // Earth radius in kilometers

	dLat := (lat2 - lat1) * (math.Pi / 180)
	dLon := (lon2 - lon1) * (math.Pi / 180)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*(math.Pi/180))*
			math.Cos(lat2*(math.Pi/180))*
			math.Sin(dLon/2)*
			math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// GeocodeByPostalCode looks up a postal code in the database and returns coordinates.
//
// Performs an O(1) lookup in the postal codes map using the postal code as key.
// Very fast operation (<1ms latency).
//
// Parameters:
//   - postalCode: Spanish postal code (5 digits, e.g., "28001")
//
// Returns:
//   - GeocodingResult with coordinates, municipality, and province
//   - PostalCodeNotFoundError if postal code doesn't exist
func (p *PostalCodeProvider) GeocodeByPostalCode(postalCode string) (domain.GeocodingResult, error) {
	logger.Debug("PostalCodeProvider", "Geocoding by postal code", map[string]interface{}{
		"postalCode": postalCode,
	})

	codes := p.getCodes()
	data, exists := codes[postalCode]
	if !exists {
		logger.Warn("PostalCodeProvider", "Postal code not found", map[string]interface{}{
			"postalCode": postalCode,
		})
		return domain.GeocodingResult{}, domain.NewPostalCodeNotFoundError(postalCode, "")
	}

	logger.Info("PostalCodeProvider", "Geocoding successful", map[string]interface{}{
		"postalCode": postalCode,
		"municipio":  data.Municipio,
		"provincia":  data.Provincia,
		"lat":        data.Lat,
		"lon":        data.Lon,
		"source":     "postal_code",
	})

	return domain.GeocodingResult{
		Success:    true,
		Coords:     domain.Coordinates{Lat: data.Lat, Lon: data.Lon},
		Municipio:  data.Municipio,
		Provincia:  data.Provincia,
		PostalCode: postalCode,
		Source:     "postal_code",
	}, nil
}

// GeocodeByMunicipio finds a postal code by municipality name.
//
// Performs a case-insensitive linear search through all postal codes to find
// the first match for the given municipality name. Returns the first postal
// code found for that municipality.
//
// Performance: O(n) search through all postal codes (~5ms).
//
// Parameters:
//   - municipio: Municipality name (case-insensitive, e.g., "Madrid" or "madrid")
//
// Returns:
//   - GeocodingResult with coordinates, postal code, and province
//   - PostalCodeNotFoundError if municipality doesn't exist
func (p *PostalCodeProvider) GeocodeByMunicipio(municipio string) (domain.GeocodingResult, error) {
	logger.Debug("PostalCodeProvider", "Geocoding by municipio", map[string]interface{}{
		"municipio": municipio,
	})

	codes := p.getCodes()
	municipioLower := strings.ToLower(strings.TrimSpace(municipio))

	// O(n) search through all postal codes
	for postalCode, data := range codes {
		if strings.ToLower(data.Municipio) == municipioLower {
			logger.Info("PostalCodeProvider", "Geocoding successful", map[string]interface{}{
				"municipio":  municipio,
				"postalCode": postalCode,
				"provincia":  data.Provincia,
				"lat":        data.Lat,
				"lon":        data.Lon,
				"source":     "municipio",
			})

			return domain.GeocodingResult{
				Success:    true,
				Coords:     domain.Coordinates{Lat: data.Lat, Lon: data.Lon},
				Municipio:  data.Municipio,
				Provincia:  data.Provincia,
				PostalCode: postalCode,
				Source:     "municipio",
			}, nil
		}
	}

	logger.Warn("PostalCodeProvider", "Municipality not found", map[string]interface{}{
		"municipio": municipio,
	})
	return domain.GeocodingResult{}, domain.NewPostalCodeNotFoundError("", municipio)
}

// ReverseGeocode finds the nearest postal code from GPS coordinates using Haversine distance.
//
// Calculates the great-circle distance between the provided coordinates and all
// postal codes in the database using the Haversine formula. Returns the nearest
// postal code with its distance in kilometers (rounded to 3 decimal places).
//
// Performance: O(n) brute force search through all 11,150 postal codes (~10-20ms).
//
// Parameters:
//   - lat: Latitude (-90 to 90)
//   - lon: Longitude (-180 to 180)
//
// Returns:
//   - GeocodingResult with nearest postal code data
//   - distance: Distance in kilometers to the nearest postal code
//   - error if no postal code found (should never happen with valid data)
func (p *PostalCodeProvider) ReverseGeocode(lat, lon float64) (domain.GeocodingResult, float64, error) {
	logger.Debug("PostalCodeProvider", "Reverse geocoding", map[string]interface{}{
		"lat": lat,
		"lon": lon,
	})

	codes := p.getCodes()

	// Find nearest postal code (brute force)
	var nearest *struct {
		postalCode string
		data       domain.PostalData
		distance   float64
	}
	minDistance := math.MaxFloat64

	for postalCode, data := range codes {
		dist := p.calculateDistance(lat, lon, data.Lat, data.Lon)

		if dist < minDistance {
			minDistance = dist
			nearest = &struct {
				postalCode string
				data       domain.PostalData
				distance   float64
			}{
				postalCode: postalCode,
				data:       data,
				distance:   dist,
			}
		}
	}

	if nearest == nil {
		logger.Error("PostalCodeProvider", "No postal code found (should never happen)", nil, nil)
		return domain.GeocodingResult{}, 0, domain.NewPostalCodeNotFoundError("", "")
	}

	// Round distance to 3 decimal places
	distance := math.Round(minDistance*1000) / 1000

	logger.Info("PostalCodeProvider", "Reverse geocoding successful", map[string]interface{}{
		"lat":        lat,
		"lon":        lon,
		"postalCode": nearest.postalCode,
		"municipio":  nearest.data.Municipio,
		"provincia":  nearest.data.Provincia,
		"distance":   distance,
	})

	return domain.GeocodingResult{
		Success:    true,
		Coords:     domain.Coordinates{Lat: nearest.data.Lat, Lon: nearest.data.Lon},
		Municipio:  nearest.data.Municipio,
		Provincia:  nearest.data.Provincia,
		PostalCode: nearest.postalCode,
		Source:     "reverse_geocode",
	}, distance, nil
}

// ValidatePostalCode checks if a postal code exists in the database.
//
// Performs an O(1) lookup in the postal codes map.
// Very fast validation (<1ms latency).
//
// Parameters:
//   - postalCode: Spanish postal code to validate (5 digits)
//
// Returns:
//   - true if postal code exists in the database
//   - false if postal code doesn't exist
func (p *PostalCodeProvider) ValidatePostalCode(postalCode string) bool {
	logger.Debug("PostalCodeProvider", "Validating postal code", map[string]interface{}{
		"postalCode": postalCode,
	})

	codes := p.getCodes()
	exists := false
	if _, ok := codes[postalCode]; ok {
		exists = true
	}

	logger.Debug("PostalCodeProvider", "Postal code validation result", map[string]interface{}{
		"postalCode": postalCode,
		"exists":     exists,
	})

	return exists
}

// ValidateMunicipio checks if a municipality exists in the database.
//
// Performs an O(1) lookup in the municipio set using lowercase normalized name.
// Very fast validation (<1ms latency).
//
// Parameters:
//   - municipio: Municipality name to validate (case-insensitive)
//
// Returns:
//   - true if municipality exists in the database
//   - false if municipality doesn't exist
func (p *PostalCodeProvider) ValidateMunicipio(municipio string) bool {
	logger.Debug("PostalCodeProvider", "Validating municipio", map[string]interface{}{
		"municipio": municipio,
	})

	p.getCodes() // Ensure indexes are built
	municipioLower := strings.ToLower(strings.TrimSpace(municipio))
	exists := p.municipioSet[municipioLower]

	logger.Debug("PostalCodeProvider", "Municipio validation result", map[string]interface{}{
		"municipio": municipio,
		"exists":    exists,
	})

	return exists
}

// AutocompletePostalCode returns postal codes matching the given prefix.
//
// Uses binary search on a pre-sorted array of postal codes to efficiently find
// all codes that start with the given prefix. Results are returned in sorted order.
//
// Performance: O(log n) to find first match + O(k) where k is the number of results.
//
// Parameters:
//   - prefix: Postal code prefix to search for (e.g., "280" for Madrid codes)
//   - limit: Maximum number of results to return
//
// Returns:
//   - Slice of AutocompleteResult with matching postal codes (up to limit)
//   - Empty slice if no matches found
func (p *PostalCodeProvider) AutocompletePostalCode(prefix string, limit int) []domain.AutocompleteResult {
	logger.Debug("PostalCodeProvider", "Autocomplete postal code", map[string]interface{}{
		"prefix": prefix,
		"limit":  limit,
	})

	codes := p.getCodes()
	results := make([]domain.AutocompleteResult, 0)

	// Binary search for first matching prefix
	startIndex := sort.Search(len(p.sortedPostalCodes), func(i int) bool {
		return p.sortedPostalCodes[i] >= prefix
	})

	if startIndex >= len(p.sortedPostalCodes) {
		logger.Debug("PostalCodeProvider", "No postal codes found for prefix", map[string]interface{}{
			"prefix": prefix,
		})
		return results
	}

	// Collect matching postal codes
	for i := startIndex; i < len(p.sortedPostalCodes) && len(results) < limit; i++ {
		postalCode := p.sortedPostalCodes[i]
		if !strings.HasPrefix(postalCode, prefix) {
			break
		}

		data := codes[postalCode]
		results = append(results, domain.AutocompleteResult{
			PostalCode: postalCode,
			Municipio:  data.Municipio,
			Provincia:  data.Provincia,
		})
	}

	logger.Info("PostalCodeProvider", "Autocomplete postal code results", map[string]interface{}{
		"prefix":       prefix,
		"limit":        limit,
		"resultsCount": len(results),
	})

	return results
}

// AutocompleteMunicipio returns municipalities matching the given query (fuzzy search).
//
// Performs a case-insensitive search through the municipio index, matching
// municipalities that either start with or contain the query string. Results
// are sorted with starts-with matches first, then alphabetically.
//
// Performance: O(n) search through municipio index (~5-10ms).
//
// Parameters:
//   - query: Municipality name query (case-insensitive, e.g., "mad" matches "Madrid")
//   - limit: Maximum number of results to return
//
// Returns:
//   - Slice of AutocompleteResult with matching municipalities (up to limit)
//   - Empty slice if no matches found
func (p *PostalCodeProvider) AutocompleteMunicipio(query string, limit int) []domain.AutocompleteResult {
	logger.Debug("PostalCodeProvider", "Autocomplete municipio", map[string]interface{}{
		"query": query,
		"limit": limit,
	})

	p.getCodes() // Ensure indexes are built
	queryLower := strings.ToLower(strings.TrimSpace(query))
	results := make([]domain.AutocompleteResult, 0)
	seenMunicipios := make(map[string]bool)

	// Collect matches (prioritize starts-with)
	type match struct {
		result     domain.AutocompleteResult
		startsWith bool
	}
	matches := make([]match, 0)

	for municipioKey, entries := range p.municipioIndex {
		if len(matches) >= limit*2 { // Collect more for sorting
			break
		}

		startsWith := strings.HasPrefix(municipioKey, queryLower)
		contains := strings.Contains(municipioKey, queryLower)

		if startsWith || contains {
			if !seenMunicipios[municipioKey] {
				seenMunicipios[municipioKey] = true
				entry := entries[0] // Use first postal code for this municipio
				matches = append(matches, match{
					result: domain.AutocompleteResult{
						PostalCode: entry.PostalCode,
						Municipio:  entry.Data.Municipio,
						Provincia:  entry.Data.Provincia,
					},
					startsWith: startsWith,
				})
			}
		}
	}

	// Sort: starts-with first, then alphabetically
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].startsWith && !matches[j].startsWith {
			return true
		}
		if !matches[i].startsWith && matches[j].startsWith {
			return false
		}
		return strings.ToLower(matches[i].result.Municipio) < strings.ToLower(matches[j].result.Municipio)
	})

	// Take up to limit results
	for i := 0; i < len(matches) && i < limit; i++ {
		results = append(results, matches[i].result)
	}

	logger.Info("PostalCodeProvider", "Autocomplete municipio results", map[string]interface{}{
		"query":        query,
		"limit":        limit,
		"resultsCount": len(results),
	})

	return results
}

