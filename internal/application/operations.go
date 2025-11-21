package application

import (
	"encoding/json"
	"os"
	"strings"

	"github.com/pricofy/geocode-es/internal/domain"
	"github.com/pricofy/geocode-es/internal/infrastructure/logger"
)

// GeocodeByPostalOperation handles the geocode-by-postal operation.
//
// Processes requests to geocode Spanish postal codes or municipalities to coordinates.
// Returns a Lambda response with the geocoding result or an appropriate error.
//
// Parameters:
//   - service: PostalCodeService instance to perform the geocoding
//   - event: LambdaEvent containing the request body with postalCode or municipio
//
// Returns:
//   - LambdaResponse with status code 200 and geocoding result on success
//   - LambdaResponse with status code 400/404/500 and error message on failure
func GeocodeByPostalOperation(service *PostalCodeService, event domain.LambdaEvent) (domain.LambdaResponse, error) {
	logger.Info("GeocodeByPostalOperation", "Processing request", nil)

	result, err := service.GeocodeByPostal(event)
	if err != nil {
		return handleGeocodeError(err, "Geocoding failed")
	}

	logger.Info("GeocodeByPostalOperation", "Geocoding successful", map[string]interface{}{
		"postalCode": result.PostalCode,
		"municipio":  result.Municipio,
		"provincia":  result.Provincia,
		"source":     result.Source,
	})

	body, _ := json.Marshal(result)
	return domain.LambdaResponse{
		StatusCode: 200,
		Body:       string(body),
	}, nil
}

// ReverseGeocodeOperation handles the reverse-geocode operation.
//
// Processes requests to find the nearest Spanish postal code from GPS coordinates.
// Uses Haversine distance calculation to find the closest match.
//
// Parameters:
//   - service: PostalCodeService instance to perform the reverse geocoding
//   - event: LambdaEvent containing the request body with lat and lon
//
// Returns:
//   - LambdaResponse with status code 200 and reverse geocoding result on success
//   - LambdaResponse with status code 400/404/500 and error message on failure
func ReverseGeocodeOperation(service *PostalCodeService, event domain.LambdaEvent) (domain.LambdaResponse, error) {
	logger.Info("ReverseGeocodeOperation", "Processing request", nil)

	result, err := service.ReverseGeocode(event)
	if err != nil {
		return handleReverseGeocodeError(err, "Reverse geocoding failed")
	}

	logger.Info("ReverseGeocodeOperation", "Reverse geocoding successful", map[string]interface{}{
		"postalCode": result.PostalCode,
		"municipio":  result.City,
		"provincia":  result.Provincia,
		"distance":   result.Distance,
	})

	body, _ := json.Marshal(result)
	return domain.LambdaResponse{
		StatusCode: 200,
		Body:       string(body),
	}, nil
}

// ValidatePostalOperation handles the validate-postal operation.
//
// Processes requests to validate if a Spanish postal code exists in the database.
//
// Parameters:
//   - service: PostalCodeService instance to perform the validation
//   - event: LambdaEvent containing the request body with postalCode
//
// Returns:
//   - LambdaResponse with status code 200 and validation result on success
//   - LambdaResponse with status code 400/500 and error message on failure
func ValidatePostalOperation(service *PostalCodeService, event domain.LambdaEvent) (domain.LambdaResponse, error) {
	logger.Info("ValidatePostalOperation", "Processing request", nil)

	result, err := service.ValidatePostal(event)
	if err != nil {
		return handleValidationError(err, "Postal code validation failed")
	}

	body, _ := json.Marshal(result)
	return domain.LambdaResponse{
		StatusCode: 200,
		Body:       string(body),
	}, nil
}

// ValidateMunicipioOperation handles the validate-municipio operation.
//
// Processes requests to validate if a Spanish municipality exists in the database.
//
// Parameters:
//   - service: PostalCodeService instance to perform the validation
//   - event: LambdaEvent containing the request body with municipio
//
// Returns:
//   - LambdaResponse with status code 200 and validation result on success
//   - LambdaResponse with status code 400/500 and error message on failure
func ValidateMunicipioOperation(service *PostalCodeService, event domain.LambdaEvent) (domain.LambdaResponse, error) {
	logger.Info("ValidateMunicipioOperation", "Processing request", nil)

	result, err := service.ValidateMunicipio(event)
	if err != nil {
		return handleValidationError(err, "Municipio validation failed")
	}

	body, _ := json.Marshal(result)
	return domain.LambdaResponse{
		StatusCode: 200,
		Body:       string(body),
	}, nil
}

// AutocompletePostalOperation handles the autocomplete-postal operation.
//
// Processes requests to autocomplete Spanish postal codes by prefix.
// Returns matching postal codes sorted alphabetically.
//
// Parameters:
//   - service: PostalCodeService instance to perform the autocomplete
//   - event: LambdaEvent containing the request body with prefix and optional limit
//
// Returns:
//   - LambdaResponse with status code 200 and autocomplete results on success
//   - LambdaResponse with status code 400/500 and error message on failure
func AutocompletePostalOperation(service *PostalCodeService, event domain.LambdaEvent) (domain.LambdaResponse, error) {
	logger.Info("AutocompletePostalOperation", "Processing request", nil)

	results, err := service.AutocompletePostal(event)
	if err != nil {
		return handleValidationError(err, "Autocomplete postal failed")
	}

	response := map[string]interface{}{
		"results": results,
		"count":   len(results),
	}

	body, _ := json.Marshal(response)
	return domain.LambdaResponse{
		StatusCode: 200,
		Body:       string(body),
	}, nil
}

// AutocompleteMunicipioOperation handles the autocomplete-municipio operation.
//
// Processes requests to autocomplete Spanish municipalities by query (fuzzy search).
// Returns matching municipalities sorted with starts-with matches first.
//
// Parameters:
//   - service: PostalCodeService instance to perform the autocomplete
//   - event: LambdaEvent containing the request body with query and optional limit
//
// Returns:
//   - LambdaResponse with status code 200 and autocomplete results on success
//   - LambdaResponse with status code 400/500 and error message on failure
func AutocompleteMunicipioOperation(service *PostalCodeService, event domain.LambdaEvent) (domain.LambdaResponse, error) {
	logger.Info("AutocompleteMunicipioOperation", "Processing request", nil)

	results, err := service.AutocompleteMunicipio(event)
	if err != nil {
		return handleValidationError(err, "Autocomplete municipio failed")
	}

	response := map[string]interface{}{
		"results": results,
		"count":   len(results),
	}

	body, _ := json.Marshal(response)
	return domain.LambdaResponse{
		StatusCode: 200,
		Body:       string(body),
	}, nil
}

// handleGeocodeError handles errors from geocoding operations.
func handleGeocodeError(err error, defaultMessage string) (domain.LambdaResponse, error) {
	logger.Error("GeocodeOperation", defaultMessage, err, nil)

	switch e := err.(type) {
	case *domain.PostalCodeNotFoundError:
		body, _ := json.Marshal(map[string]interface{}{
			"success": false,
			"error":   "Postal code or municipio not found",
			"hint":     "Please provide a valid Spanish postal code (e.g., \"28001\") or municipality name (e.g., \"Madrid\")",
		})
		return domain.LambdaResponse{
			StatusCode: 404,
			Body:       string(body),
		}, nil

	case *domain.InvalidCoordinatesError, *domain.ValidationError:
		body, _ := json.Marshal(map[string]interface{}{
			"success": false,
			"error":   e.Error(),
		})
		return domain.LambdaResponse{
			StatusCode: 400,
			Body:       string(body),
		}, nil

	default:
		return handleInternalError(err, defaultMessage)
	}
}

// handleReverseGeocodeError handles errors from reverse geocoding operations.
func handleReverseGeocodeError(err error, defaultMessage string) (domain.LambdaResponse, error) {
	logger.Error("ReverseGeocodeOperation", defaultMessage, err, nil)

	switch e := err.(type) {
	case *domain.InvalidCoordinatesError, *domain.ValidationError:
		body, _ := json.Marshal(map[string]interface{}{
			"success": false,
			"error":   e.Error(),
		})
		return domain.LambdaResponse{
			StatusCode: 400,
			Body:       string(body),
		}, nil

	case *domain.PostalCodeNotFoundError:
		body, _ := json.Marshal(map[string]interface{}{
			"success": false,
			"error":   "No postal code found",
		})
		return domain.LambdaResponse{
			StatusCode: 404,
			Body:       string(body),
		}, nil

	default:
		return handleInternalError(err, defaultMessage)
	}
}

// handleValidationError handles errors from validation operations.
// For autocomplete operations, returns results: [] and count: 0 on error (TypeScript compatibility).
// For validate operations, returns valid: false on error (TypeScript compatibility).
func handleValidationError(err error, defaultMessage string) (domain.LambdaResponse, error) {
	logger.Error("ValidationOperation", defaultMessage, err, nil)

	switch e := err.(type) {
	case *domain.ValidationError:
		// Check if this is for autocomplete (based on error message or context)
		// For autocomplete, return results: [] format
		if contains(defaultMessage, "autocomplete") {
			body, _ := json.Marshal(map[string]interface{}{
				"results": []interface{}{},
				"count":   0,
				"error":   e.Error(),
			})
			return domain.LambdaResponse{
				StatusCode: 400,
				Body:       string(body),
			}, nil
		}
		// For validate operations, return valid: false format
		body, _ := json.Marshal(map[string]interface{}{
			"valid": false,
			"error": e.Error(),
		})
		return domain.LambdaResponse{
			StatusCode: 400,
			Body:       string(body),
		}, nil

	default:
		// For autocomplete, return results: [] format even on internal errors
		if contains(defaultMessage, "autocomplete") {
			isDev := os.Getenv("ENVIRONMENT") == "dev"
			responseBody := map[string]interface{}{
				"results": []interface{}{},
				"count":   0,
				"error":   "Internal server error",
			}
			if isDev && err != nil {
				responseBody["details"] = err.Error()
			}
			body, _ := json.Marshal(responseBody)
			return domain.LambdaResponse{
				StatusCode: 500,
				Body:       string(body),
			}, nil
		}
		return handleInternalError(err, defaultMessage)
	}
}

// contains checks if a string contains a substring (case-insensitive).
func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// handleInternalError handles internal server errors.
func handleInternalError(err error, defaultMessage string) (domain.LambdaResponse, error) {
	isDev := os.Getenv("ENVIRONMENT") == "dev"

	responseBody := map[string]interface{}{
		"success": false,
		"error":   "Internal server error",
	}

	if isDev && err != nil {
		responseBody["details"] = err.Error()
	}

	body, _ := json.Marshal(responseBody)
	return domain.LambdaResponse{
		StatusCode: 500,
		Body:       string(body),
	}, nil
}

