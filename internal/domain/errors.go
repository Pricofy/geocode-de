package domain

import (
	"fmt"
	"time"
)

// LocationError is the base error type for all geocoding service errors.
// Provides consistent error structure with timestamps.
type LocationError struct {
	Message   string
	Timestamp time.Time
}

// Error implements the error interface.
func (e *LocationError) Error() string {
	return e.Message
}

// PostalCodeNotFoundError is returned when a postal code or municipality
// is not found in the database.
type PostalCodeNotFoundError struct {
	LocationError
	PostalCode   string
	Municipality string
}

// NewPostalCodeNotFoundError creates a new PostalCodeNotFoundError.
// If postalCode is provided, uses it in the message.
// If municipality is provided, uses it in the message.
// Otherwise, uses a generic message.
func NewPostalCodeNotFoundError(postalCode, municipality string) *PostalCodeNotFoundError {
	var message string
	switch {
	case postalCode != "":
		message = fmt.Sprintf("Postal code not found: %s", postalCode)
	case municipality != "":
		message = fmt.Sprintf("Municipality not found: %s", municipality)
	default:
		message = "Postal code or municipality not found"
	}

	return &PostalCodeNotFoundError{
		LocationError: LocationError{
			Message:   message,
			Timestamp: time.Now(),
		},
		PostalCode:   postalCode,
		Municipality: municipality,
	}
}

// InvalidCoordinatesError is returned when coordinates are invalid
// (out of range, NaN, or null).
type InvalidCoordinatesError struct {
	LocationError
	Lat float64
	Lon float64
}

// NewInvalidCoordinatesError creates a new InvalidCoordinatesError.
func NewInvalidCoordinatesError(message string, lat, lon float64) *InvalidCoordinatesError {
	return &InvalidCoordinatesError{
		LocationError: LocationError{
			Message:   message,
			Timestamp: time.Now(),
		},
		Lat: lat,
		Lon: lon,
	}
}

// ValidationError is returned when input validation fails
// (invalid format, missing required fields, etc.).
type ValidationError struct {
	LocationError
	Field string
}

// NewValidationError creates a new ValidationError.
func NewValidationError(message, field string) *ValidationError {
	return &ValidationError{
		LocationError: LocationError{
			Message:   message,
			Timestamp: time.Now(),
		},
		Field: field,
	}
}
