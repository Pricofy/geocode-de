package application

import (
	"encoding/json"
	"math"
	"regexp"

	"github.com/pricofy/geocode-es/internal/domain"
	"github.com/pricofy/geocode-es/internal/infrastructure/logger"
	"github.com/pricofy/geocode-es/internal/infrastructure/provider"
)

// PostalCodeService provides business logic for Spanish postal code operations.
// Coordinates between the handler layer and the provider layer.
// Handles input validation, parsing, and error handling.
type PostalCodeService struct {
	provider *provider.PostalCodeProvider
}

// NewPostalCodeService creates a new PostalCodeService instance.
func NewPostalCodeService() *PostalCodeService {
	return &PostalCodeService{
		provider: provider.NewPostalCodeProvider(),
	}
}

// postalCodeRegex is the compiled regex for validating Spanish postal codes (5 digits).
var postalCodeRegex = regexp.MustCompile(domain.POSTAL_CODE_REGEX_PATTERN)

// validateCoordinates validates that coordinates are within valid ranges.
func (s *PostalCodeService) validateCoordinates(lat, lon float64) error {
	if math.IsNaN(lat) || math.IsNaN(lon) ||
		lat < domain.MIN_LATITUDE || lat > domain.MAX_LATITUDE ||
		lon < domain.MIN_LONGITUDE || lon > domain.MAX_LONGITUDE {
		return domain.NewInvalidCoordinatesError("Invalid coordinates", lat, lon)
	}
	return nil
}

// GeocodeByPostal geocodes a postal code or municipality to coordinates.
// Tries postal code first (faster, O(1)), then municipality if not found (O(n)).
func (s *PostalCodeService) GeocodeByPostal(event domain.LambdaEvent) (domain.GeocodingResult, error) {
	postalCode, municipality, err := s.parseGeocodingInput(event)
	if err != nil {
		return domain.GeocodingResult{}, err
	}

	logger.Debug("PostalCodeService", "Geocoding by postal", map[string]interface{}{
		"postalCode":   postalCode,
		"municipality": municipality,
	})

	// Try postal code first (most precise, O(1))
	if postalCode != "" {
		result, err := s.tryGeocodeByPostalCode(postalCode, municipality)
		if err == nil {
			return result, nil
		}
		// If postal code not found and we have municipality, continue to try municipality
		if _, ok := err.(*domain.PostalCodeNotFoundError); !ok || municipality == "" {
			return domain.GeocodingResult{}, err
		}
	}

	// Try municipality (less precise, O(n))
	if municipality != "" {
		return s.geocodeByMunicipality(municipality)
	}

	// Neither postal code nor municipality provided
	return domain.GeocodingResult{}, domain.NewPostalCodeNotFoundError("", "")
}

// parseGeocodingInput parses and validates geocoding input from Lambda event.
func (s *PostalCodeService) parseGeocodingInput(event domain.LambdaEvent) (postalCode, municipality string, err error) {
	var body domain.RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		logger.Error("PostalCodeService", "Failed to parse request body", err, nil)
		return "", "", domain.NewValidationError("Invalid JSON in request body", "body")
	}

	if body.PostalCode != nil {
		postalCode = *body.PostalCode
	}
	if body.Municipality != nil {
		municipality = *body.Municipality
	}

	return postalCode, municipality, nil
}

// tryGeocodeByPostalCode attempts to geocode by postal code.
// Returns error if postal code format is invalid or not found.
func (s *PostalCodeService) tryGeocodeByPostalCode(postalCode, municipio string) (domain.GeocodingResult, error) {
	// Validate postal code format
	if !postalCodeRegex.MatchString(postalCode) {
		logger.Warn("PostalCodeService", "Invalid postal code format", map[string]interface{}{
			"postalCode": postalCode,
		})
		return domain.GeocodingResult{}, domain.NewValidationError(
			"Invalid postal code format: expected 5 digits",
			"postalCode",
		)
	}

	result, err := s.provider.GeocodeByPostalCode(postalCode)
	if err != nil {
		if _, ok := err.(*domain.PostalCodeNotFoundError); ok && municipio != "" {
			logger.Debug("PostalCodeService", "Postal code not found, will try municipio", map[string]interface{}{
				"postalCode": postalCode,
				"municipio":  municipio,
			})
			return domain.GeocodingResult{}, err
		}
		return domain.GeocodingResult{}, err
	}

	logger.Info("PostalCodeService", "Geocoding successful by postal code", map[string]interface{}{
		"postalCode": postalCode,
		"municipio":  result.Municipio,
		"provincia":  result.Provincia,
	})

	return result, nil
}

// geocodeByMunicipio geocodes by municipality name.
func (s *PostalCodeService) geocodeByMunicipio(municipio string) (domain.GeocodingResult, error) {
	result, err := s.provider.GeocodeByMunicipio(municipio)
	if err != nil {
		logger.Warn("PostalCodeService", "Municipio not found", map[string]interface{}{
			"municipio": municipio,
		})
		return domain.GeocodingResult{}, err
	}

	logger.Info("PostalCodeService", "Geocoding successful by municipio", map[string]interface{}{
		"municipio":  municipio,
		"postalCode": result.PostalCode,
		"provincia":  result.Provincia,
	})

	return result, nil
}

// ReverseGeocode finds the nearest postal code from GPS coordinates.
//
// Uses Haversine distance formula to calculate the great-circle distance
// between the provided coordinates and all postal codes in the database.
// Returns the nearest postal code with its distance in kilometers.
//
// Performance: O(n) brute force search through all postal codes (~10-20ms).
//
// Parameters:
//   - event: LambdaEvent containing lat and lon in the body
//
// Returns:
//   - ReverseGeocodingResult with nearest postal code and distance
//   - error if coordinates are invalid or parsing fails
func (s *PostalCodeService) ReverseGeocode(event domain.LambdaEvent) (domain.ReverseGeocodingResult, error) {
	var body domain.RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		logger.Error("PostalCodeService", "Failed to parse request body", err, nil)
		return domain.ReverseGeocodingResult{}, domain.NewValidationError("Invalid JSON in request body", "body")
	}

	if body.Lat == nil || body.Lon == nil {
		return domain.ReverseGeocodingResult{}, domain.NewValidationError("lat and lon are required", "coordinates")
	}

	lat := *body.Lat
	lon := *body.Lon

	if err := s.validateCoordinates(lat, lon); err != nil {
		return domain.ReverseGeocodingResult{}, err
	}

	logger.Debug("PostalCodeService", "Reverse geocoding", map[string]interface{}{
		"lat": lat,
		"lon": lon,
	})

	result, distance, err := s.provider.ReverseGeocode(lat, lon)
	if err != nil {
		logger.Error("PostalCodeService", "Reverse geocoding failed", err, map[string]interface{}{
			"lat": lat,
			"lon": lon,
		})
		return domain.ReverseGeocodingResult{}, err
	}

	logger.Info("PostalCodeService", "Reverse geocoding successful", map[string]interface{}{
		"lat":        lat,
		"lon":        lon,
		"postalCode": result.PostalCode,
		"municipio":  result.Municipio,
		"distance":   distance,
	})

	return domain.ReverseGeocodingResult{
		Success:    result.Success,
		City:       result.Municipio,
		PostalCode: result.PostalCode,
		Provincia:  result.Provincia,
		Country:    "España",
		Coords:     result.Coords,
		Distance:   distance,
	}, nil
}

// ValidatePostal validates if a postal code exists in the database.
//
// Performs an O(1) lookup in the postal codes map.
// Very fast validation (<1ms latency).
//
// Parameters:
//   - event: LambdaEvent containing postalCode in the body
//
// Returns:
//   - ValidationResult with valid flag and the postal code value
//   - error if input parsing fails
func (s *PostalCodeService) ValidatePostal(event domain.LambdaEvent) (domain.ValidationResult, error) {
	postalCode, err := s.parseValidationInput(event, "postalCode")
	if err != nil {
		return domain.ValidationResult{}, err
	}

	logger.Debug("PostalCodeService", "Validating postal code", map[string]interface{}{
		"postalCode": postalCode,
	})

	isValid := s.provider.ValidatePostalCode(postalCode)

	logger.Info("PostalCodeService", "Postal code validation result", map[string]interface{}{
		"postalCode": postalCode,
		"valid":      isValid,
	})

	return domain.ValidationResult{
		Valid: isValid,
		Value: postalCode,
	}, nil
}

// ValidateMunicipio validates if a municipality exists in the database.
//
// Performs an O(1) lookup in the municipio set using lowercase normalized name.
// Very fast validation (<1ms latency).
//
// Parameters:
//   - event: LambdaEvent containing municipio in the body
//
// Returns:
//   - ValidationResult with valid flag and the municipio value
//   - error if input parsing fails
func (s *PostalCodeService) ValidateMunicipio(event domain.LambdaEvent) (domain.ValidationResult, error) {
	municipio, err := s.parseValidationInput(event, "municipio")
	if err != nil {
		return domain.ValidationResult{}, err
	}

	logger.Debug("PostalCodeService", "Validating municipio", map[string]interface{}{
		"municipio": municipio,
	})

	isValid := s.provider.ValidateMunicipio(municipio)

	logger.Info("PostalCodeService", "Municipio validation result", map[string]interface{}{
		"municipio": municipio,
		"valid":     isValid,
	})

	return domain.ValidationResult{
		Valid: isValid,
		Value: municipio,
	}, nil
}

// AutocompletePostal returns postal codes matching the given prefix.
//
// Uses binary search on a sorted array of postal codes for efficient prefix matching.
// Performance: O(log n) to find first match + O(k) where k is result count.
//
// Parameters:
//   - event: LambdaEvent containing prefix and optional limit in the body
//
// Returns:
//   - Slice of AutocompleteResult with matching postal codes (up to limit)
//   - error if input parsing fails
//
// Limits:
//   - Default limit: 10 results
//   - Maximum limit: 50 results (enforced automatically)
func (s *PostalCodeService) AutocompletePostal(event domain.LambdaEvent) ([]domain.AutocompleteResult, error) {
	prefix, limit, err := s.parseAutocompleteInput(event, true)
	if err != nil {
		return nil, err
	}

	logger.Debug("PostalCodeService", "Autocomplete postal code", map[string]interface{}{
		"prefix": prefix,
		"limit":  limit,
	})

	results := s.provider.AutocompletePostalCode(prefix, limit)

	logger.Info("PostalCodeService", "Autocomplete postal code results", map[string]interface{}{
		"prefix":       prefix,
		"limit":        limit,
		"resultsCount": len(results),
	})

	return results, nil
}

// AutocompleteMunicipio returns municipalities matching the given query (fuzzy search).
//
// Performs a case-insensitive search through the municipio index, prioritizing
// results that start with the query over those that contain it. Results are
// sorted alphabetically with starts-with matches first.
//
// Performance: O(n) search through municipio index (~5-10ms).
//
// Parameters:
//   - event: LambdaEvent containing query and optional limit in the body
//
// Returns:
//   - Slice of AutocompleteResult with matching municipalities (up to limit)
//   - error if input parsing fails
//
// Limits:
//   - Default limit: 10 results
//   - Maximum limit: 50 results (enforced automatically)
func (s *PostalCodeService) AutocompleteMunicipio(event domain.LambdaEvent) ([]domain.AutocompleteResult, error) {
	query, limit, err := s.parseAutocompleteInput(event, false)
	if err != nil {
		return nil, err
	}

	logger.Debug("PostalCodeService", "Autocomplete municipio", map[string]interface{}{
		"query": query,
		"limit": limit,
	})

	results := s.provider.AutocompleteMunicipio(query, limit)

	logger.Info("PostalCodeService", "Autocomplete municipio results", map[string]interface{}{
		"query":        query,
		"limit":        limit,
		"resultsCount": len(results),
	})

	return results, nil
}

// parseValidationInput parses and validates validation input from Lambda event.
func (s *PostalCodeService) parseValidationInput(event domain.LambdaEvent, field string) (string, error) {
	var body domain.RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		logger.Error("PostalCodeService", "Failed to parse request body", err, nil)
		return "", domain.NewValidationError("Invalid JSON in request body", "body")
	}

	var value string
	if field == "postalCode" && body.PostalCode != nil {
		value = *body.PostalCode
	} else if field == "municipio" && body.Municipio != nil {
		value = *body.Municipio
	}

	if value == "" {
		return "", domain.NewValidationError(
			field+" is required and must be a non-empty string",
			field,
		)
	}

	return value, nil
}

// parseAutocompleteInput parses and validates autocomplete input from Lambda event.
// isPostalCode indicates whether this is for postal code (prefix) or municipio (query).
func (s *PostalCodeService) parseAutocompleteInput(event domain.LambdaEvent, isPostalCode bool) (string, int, error) {
	var body domain.RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		logger.Error("PostalCodeService", "Failed to parse request body", err, nil)
		return "", 0, domain.NewValidationError("Invalid JSON in request body", "body")
	}

	var value string
	if isPostalCode {
		if body.Prefix == nil {
			return "", 0, domain.NewValidationError("prefix is required", "prefix")
		}
		value = *body.Prefix
	} else {
		if body.Query == nil {
			return "", 0, domain.NewValidationError("query is required", "query")
		}
		value = *body.Query
	}

	limit := domain.DEFAULT_AUTOCOMPLETE_LIMIT
	if body.Limit != nil {
		limit = *body.Limit
		if limit < 1 {
			return "", 0, domain.NewValidationError("limit must be a positive number", "limit")
		}
		if limit > domain.MAX_AUTOCOMPLETE_LIMIT {
			limit = domain.MAX_AUTOCOMPLETE_LIMIT
		}
	}

	return value, limit, nil
}

