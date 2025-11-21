package domain

// Constants for Spanish postal code geocoding service.

// POSTAL_CODE_REGEX_PATTERN is the regex pattern for Spanish postal codes.
// Format: 5 digits (e.g., 28001, 08001).
const POSTAL_CODE_REGEX_PATTERN = `^\d{5}$`

// EARTH_RADIUS_KM is the Earth's radius in kilometers for Haversine distance calculations.
const EARTH_RADIUS_KM = 6371

// Coordinate validation ranges.
const (
	// MIN_LATITUDE is the minimum valid latitude (-90).
	MIN_LATITUDE = -90
	// MAX_LATITUDE is the maximum valid latitude (90).
	MAX_LATITUDE = 90
	// MIN_LONGITUDE is the minimum valid longitude (-180).
	MIN_LONGITUDE = -180
	// MAX_LONGITUDE is the maximum valid longitude (180).
	MAX_LONGITUDE = 180
)

// Default and maximum limits for autocomplete operations.
const (
	// DEFAULT_AUTOCOMPLETE_LIMIT is the default number of results for autocomplete (10).
	DEFAULT_AUTOCOMPLETE_LIMIT = 10
	// MAX_AUTOCOMPLETE_LIMIT is the maximum number of results for autocomplete (50).
	MAX_AUTOCOMPLETE_LIMIT = 50
)

