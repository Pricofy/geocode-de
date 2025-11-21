package application

import (
	"encoding/json"
	"testing"

	"github.com/pricofy/geocode-es/internal/domain"
)

func TestPostalCodeService_GeocodeByPostal(t *testing.T) {
	service := NewPostalCodeService()

	tests := []struct {
		name        string
		event       domain.LambdaEvent
		wantSuccess bool
		wantErr     bool
	}{
		{
			name: "valid postal code",
			event: domain.LambdaEvent{
				Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
			},
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name: "valid municipio",
			event: domain.LambdaEvent{
				Body: `{"operation":"geocode-by-postal","municipio":"Madrid"}`,
			},
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name: "invalid postal code format",
			event: domain.LambdaEvent{
				Body: `{"operation":"geocode-by-postal","postalCode":"123"}`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name: "invalid JSON",
			event: domain.LambdaEvent{
				Body: `invalid json`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name: "missing both postal code and municipio",
			event: domain.LambdaEvent{
				Body: `{"operation":"geocode-by-postal"}`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.GeocodeByPostal(tt.event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.Success != tt.wantSuccess {
					t.Errorf("Expected success=%v, got %v", tt.wantSuccess, result.Success)
				}
			}
		})
	}
}

func TestPostalCodeService_ReverseGeocode(t *testing.T) {
	service := NewPostalCodeService()

	tests := []struct {
		name        string
		event       domain.LambdaEvent
		wantSuccess bool
		wantErr     bool
	}{
		{
			name: "valid coordinates",
			event: domain.LambdaEvent{
				Body: `{"operation":"reverse-geocode","lat":40.4168,"lon":-3.7038}`,
			},
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name: "missing lat",
			event: domain.LambdaEvent{
				Body: `{"operation":"reverse-geocode","lon":-3.7038}`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name: "missing lon",
			event: domain.LambdaEvent{
				Body: `{"operation":"reverse-geocode","lat":40.4168}`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name: "invalid coordinates - out of range",
			event: domain.LambdaEvent{
				Body: `{"operation":"reverse-geocode","lat":100,"lon":-3.7038}`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name: "invalid JSON",
			event: domain.LambdaEvent{
				Body: `invalid json`,
			},
			wantSuccess: false,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ReverseGeocode(tt.event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.Success != tt.wantSuccess {
					t.Errorf("Expected success=%v, got %v", tt.wantSuccess, result.Success)
				}
				if result.PostalCode == "" {
					t.Errorf("Expected non-empty postalCode")
				}
				if result.Distance < 0 {
					t.Errorf("Expected non-negative distance, got %f", result.Distance)
				}
			}
		})
	}
}

func TestPostalCodeService_ValidatePostal(t *testing.T) {
	service := NewPostalCodeService()

	tests := []struct {
		name        string
		event       domain.LambdaEvent
		wantValid   bool
		wantErr     bool
	}{
		{
			name: "valid postal code",
			event: domain.LambdaEvent{
				Body: `{"operation":"validate-postal","postalCode":"28001"}`,
			},
			wantValid: true,
			wantErr:   false,
		},
		{
			name: "invalid postal code",
			event: domain.LambdaEvent{
				Body: `{"operation":"validate-postal","postalCode":"99999"}`,
			},
			wantValid: false,
			wantErr:   false,
		},
		{
			name: "missing postal code",
			event: domain.LambdaEvent{
				Body: `{"operation":"validate-postal"}`,
			},
			wantValid: false,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ValidatePostal(tt.event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.Valid != tt.wantValid {
					t.Errorf("Expected valid=%v, got %v", tt.wantValid, result.Valid)
				}
			}
		})
	}
}

func TestPostalCodeService_ValidateMunicipio(t *testing.T) {
	service := NewPostalCodeService()

	tests := []struct {
		name        string
		event       domain.LambdaEvent
		wantValid   bool
		wantErr     bool
	}{
		{
			name: "valid municipio",
			event: domain.LambdaEvent{
				Body: `{"operation":"validate-municipio","municipio":"Madrid"}`,
			},
			wantValid: true,
			wantErr:   false,
		},
		{
			name: "invalid municipio",
			event: domain.LambdaEvent{
				Body: `{"operation":"validate-municipio","municipio":"NonExistentCity"}`,
			},
			wantValid: false,
			wantErr:   false,
		},
		{
			name: "missing municipio",
			event: domain.LambdaEvent{
				Body: `{"operation":"validate-municipio"}`,
			},
			wantValid: false,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ValidateMunicipio(tt.event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.Valid != tt.wantValid {
					t.Errorf("Expected valid=%v, got %v", tt.wantValid, result.Valid)
				}
			}
		})
	}
}

func TestPostalCodeService_AutocompletePostal(t *testing.T) {
	service := NewPostalCodeService()

	tests := []struct {
		name      string
		event     domain.LambdaEvent
		wantCount int
		wantErr   bool
	}{
		{
			name: "valid prefix",
			event: domain.LambdaEvent{
				Body: `{"operation":"autocomplete-postal","prefix":"280","limit":5}`,
			},
			wantCount: 5,
			wantErr:   false,
		},
		{
			name: "missing prefix",
			event: domain.LambdaEvent{
				Body: `{"operation":"autocomplete-postal","limit":5}`,
			},
			wantCount: 0,
			wantErr:   true,
		},
		{
			name: "default limit",
			event: domain.LambdaEvent{
				Body: `{"operation":"autocomplete-postal","prefix":"280"}`,
			},
			wantCount: 10, // default limit
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := service.AutocompletePostal(tt.event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if len(results) > tt.wantCount {
					t.Errorf("Expected at most %d results, got %d", tt.wantCount, len(results))
				}
			}
		})
	}
}

func TestPostalCodeService_AutocompleteMunicipio(t *testing.T) {
	service := NewPostalCodeService()

	tests := []struct {
		name      string
		event     domain.LambdaEvent
		wantCount int
		wantErr   bool
	}{
		{
			name: "valid query",
			event: domain.LambdaEvent{
				Body: `{"operation":"autocomplete-municipio","query":"mad","limit":5}`,
			},
			wantCount: 5,
			wantErr:   false,
		},
		{
			name: "missing query",
			event: domain.LambdaEvent{
				Body: `{"operation":"autocomplete-municipio","limit":5}`,
			},
			wantCount: 0,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := service.AutocompleteMunicipio(tt.event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if len(results) > tt.wantCount {
					t.Errorf("Expected at most %d results, got %d", tt.wantCount, len(results))
				}
			}
		})
	}
}

func TestPostalCodeService_ValidateCoordinates(t *testing.T) {
	service := NewPostalCodeService()

	// Test coordinate validation through ReverseGeocode
	tests := []struct {
		name    string
		lat     float64
		lon     float64
		wantErr bool
	}{
		{
			name:    "valid coordinates",
			lat:     40.4168,
			lon:     -3.7038,
			wantErr: false,
		},
		{
			name:    "latitude too high",
			lat:     91.0,
			lon:     -3.7038,
			wantErr: true,
		},
		{
			name:    "latitude too low",
			lat:     -91.0,
			lon:     -3.7038,
			wantErr: true,
		},
		{
			name:    "longitude too high",
			lat:     40.4168,
			lon:     181.0,
			wantErr: true,
		},
		{
			name:    "longitude too low",
			lat:     40.4168,
			lon:     -181.0,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			eventBody, _ := json.Marshal(map[string]interface{}{
				"operation": "reverse-geocode",
				"lat":       tt.lat,
				"lon":       tt.lon,
			})

			event := domain.LambdaEvent{
				Body: string(eventBody),
			}

			_, err := service.ReverseGeocode(event)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
			}
		})
	}
}

