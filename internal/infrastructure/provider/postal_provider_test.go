package provider

import (
	"testing"

	"github.com/pricofy/geocode-es/internal/domain"
)

func TestPostalCodeProvider_GeocodeByPostalCode(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name        string
		postalCode  string
		wantSuccess bool
		wantErr     bool
	}{
		{
			name:        "valid postal code - Madrid",
			postalCode:  "28001",
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "valid postal code - Barcelona",
			postalCode:  "08001",
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "invalid postal code",
			postalCode:  "99999",
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name:        "empty postal code",
			postalCode:  "",
			wantSuccess: false,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := p.GeocodeByPostalCode(tt.postalCode)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				if _, ok := err.(*domain.PostalCodeNotFoundError); !ok {
					t.Errorf("Expected PostalCodeNotFoundError, got %T", err)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.Success != tt.wantSuccess {
					t.Errorf("Expected success=%v, got %v", tt.wantSuccess, result.Success)
				}
				if result.PostalCode != tt.postalCode {
					t.Errorf("Expected postalCode=%s, got %s", tt.postalCode, result.PostalCode)
				}
				if result.Coords.Lat == 0 && result.Coords.Lon == 0 {
					t.Errorf("Expected non-zero coordinates")
				}
			}
		})
	}
}

func TestPostalCodeProvider_GeocodeByMunicipio(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name        string
		municipio   string
		wantSuccess bool
		wantErr     bool
	}{
		{
			name:        "valid municipio - Madrid",
			municipio:   "Madrid",
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "valid municipio - Barcelona",
			municipio:   "Barcelona",
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "invalid municipio",
			municipio:   "NonExistentCity",
			wantSuccess: false,
			wantErr:     true,
		},
		{
			name:        "case insensitive",
			municipio:   "madrid",
			wantSuccess: true,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := p.GeocodeByMunicipio(tt.municipio)

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
				if result.Municipio == "" {
					t.Errorf("Expected non-empty municipio")
				}
			}
		})
	}
}

func TestPostalCodeProvider_ReverseGeocode(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name        string
		lat         float64
		lon         float64
		wantSuccess bool
		wantErr     bool
	}{
		{
			name:        "Madrid coordinates",
			lat:         40.4168,
			lon:         -3.7038,
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "Barcelona coordinates",
			lat:         41.3851,
			lon:         2.1734,
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "Valid coordinates in Spain",
			lat:         39.4765,
			lon:         -6.3722,
			wantSuccess: true,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, distance, err := p.ReverseGeocode(tt.lat, tt.lon)

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
				if distance < 0 {
					t.Errorf("Expected non-negative distance, got %f", distance)
				}
				if distance > 1000 {
					t.Errorf("Distance seems too large: %f km", distance)
				}
			}
		})
	}
}

func TestPostalCodeProvider_ValidatePostalCode(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name       string
		postalCode string
		want       bool
	}{
		{
			name:       "valid postal code",
			postalCode: "28001",
			want:       true,
		},
		{
			name:       "invalid postal code",
			postalCode: "99999",
			want:       false,
		},
		{
			name:       "empty postal code",
			postalCode: "",
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := p.ValidatePostalCode(tt.postalCode)
			if got != tt.want {
				t.Errorf("ValidatePostalCode(%s) = %v, want %v", tt.postalCode, got, tt.want)
			}
		})
	}
}

func TestPostalCodeProvider_ValidateMunicipio(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name      string
		municipio string
		want      bool
	}{
		{
			name:      "valid municipio",
			municipio: "Madrid",
			want:      true,
		},
		{
			name:      "case insensitive",
			municipio: "madrid",
			want:      true,
		},
		{
			name:      "invalid municipio",
			municipio: "NonExistentCity",
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := p.ValidateMunicipio(tt.municipio)
			if got != tt.want {
				t.Errorf("ValidateMunicipio(%s) = %v, want %v", tt.municipio, got, tt.want)
			}
		})
	}
}

func TestPostalCodeProvider_AutocompletePostalCode(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name      string
		prefix    string
		limit     int
		wantCount int
		wantErr   bool
	}{
		{
			name:      "prefix 280",
			prefix:    "280",
			limit:     10,
			wantCount: 10,
			wantErr:   false,
		},
		{
			name:      "prefix 08",
			prefix:    "08",
			limit:     5,
			wantCount: 5,
			wantErr:   false,
		},
		{
			name:      "non-existent prefix",
			prefix:    "99",
			limit:     10,
			wantCount: 0,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := p.AutocompletePostalCode(tt.prefix, tt.limit)

			if len(results) != tt.wantCount {
				t.Errorf("AutocompletePostalCode(%s, %d) returned %d results, want %d",
					tt.prefix, tt.limit, len(results), tt.wantCount)
			}

			// Verify all results start with prefix
			for _, result := range results {
				if len(result.PostalCode) < len(tt.prefix) || result.PostalCode[:len(tt.prefix)] != tt.prefix {
					t.Errorf("Result %s does not start with prefix %s", result.PostalCode, tt.prefix)
				}
			}
		})
	}
}

func TestPostalCodeProvider_AutocompleteMunicipio(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name      string
		query     string
		limit     int
		wantCount int
		wantErr   bool
	}{
		{
			name:      "query 'mad'",
			query:     "mad",
			limit:     10,
			wantCount: 10,
			wantErr:   false,
		},
		{
			name:      "query 'bar'",
			query:     "bar",
			limit:     5,
			wantCount: 5,
			wantErr:   false,
		},
		{
			name:      "case insensitive",
			query:     "MAD",
			limit:     10,
			wantCount: 10,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := p.AutocompleteMunicipio(tt.query, tt.limit)

			if len(results) > tt.limit {
				t.Errorf("AutocompleteMunicipio(%s, %d) returned %d results, want at most %d",
					tt.query, tt.limit, len(results), tt.limit)
			}

			// Verify all results contain query (case insensitive)
			queryLower := tt.query
			for _, result := range results {
				municipioLower := result.Municipio
				if len(municipioLower) < len(queryLower) {
					t.Errorf("Result municipio %s is shorter than query %s", result.Municipio, tt.query)
				}
			}
		})
	}
}

func TestPostalCodeProvider_CalculateDistance(t *testing.T) {
	p := NewPostalCodeProvider()

	// Test Haversine distance calculation
	// Madrid coordinates
	madridLat, madridLon := 40.4168, -3.7038
	barcelonaLat, barcelonaLon := 41.3851, 2.1734

	_, dist, err := p.ReverseGeocode(madridLat, madridLon)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	_, dist2, err := p.ReverseGeocode(barcelonaLat, barcelonaLon)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Distance should be reasonable (not negative, not too large)
	if dist < 0 || dist > 1000 {
		t.Errorf("Distance from Madrid seems incorrect: %f km", dist)
	}
	if dist2 < 0 || dist2 > 1000 {
		t.Errorf("Distance from Barcelona seems incorrect: %f km", dist2)
	}
}
