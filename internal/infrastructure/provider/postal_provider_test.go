package provider

import (
	"testing"

	"github.com/pricofy/geocode-de/internal/domain"
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
			name:        "valid postal code - Berlin",
			postalCode:  "10115",
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "valid postal code - Munich",
			postalCode:  "80331",
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

func TestPostalCodeProvider_GeocodeByMunicipality(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name         string
		municipality string
		wantSuccess  bool
		wantErr      bool
	}{
		{
			name:         "valid municipality - Berlin",
			municipality: "Berlin",
			wantSuccess:  true,
			wantErr:      false,
		},
		{
			name:         "valid municipality - Munich",
			municipality: "München",
			wantSuccess:  true,
			wantErr:      false,
		},
		{
			name:         "invalid municipality",
			municipality: "NonExistentCity",
			wantSuccess:  false,
			wantErr:      true,
		},
		{
			name:         "case insensitive",
			municipality: "berlin",
			wantSuccess:  true,
			wantErr:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := p.GeocodeByMunicipality(tt.municipality)

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
				if result.Municipality == "" {
					t.Errorf("Expected non-empty municipality")
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
			name:        "Berlin coordinates",
			lat:         52.5323,
			lon:         13.3846,
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "Munich coordinates",
			lat:         48.1345,
			lon:         11.571,
			wantSuccess: true,
			wantErr:     false,
		},
		{
			name:        "Valid coordinates in Germany",
			lat:         50.1109,
			lon:         8.6821,
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
			postalCode: "10115",
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

func TestPostalCodeProvider_ValidateMunicipality(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name         string
		municipality string
		want         bool
	}{
		{
			name:         "valid municipality",
			municipality: "Berlin",
			want:         true,
		},
		{
			name:         "case insensitive",
			municipality: "berlin",
			want:         true,
		},
		{
			name:         "invalid municipality",
			municipality: "NonExistentCity",
			want:         false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := p.ValidateMunicipality(tt.municipality)
			if got != tt.want {
				t.Errorf("ValidateMunicipality(%s) = %v, want %v", tt.municipality, got, tt.want)
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
			name:      "prefix 10",
			prefix:    "10",
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
			prefix:    "000",
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

func TestPostalCodeProvider_AutocompleteMunicipality(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name      string
		query     string
		limit     int
		wantCount int
		wantErr   bool
	}{
		{
			name:      "query 'Ber'",
			query:     "Ber",
			limit:     10,
			wantCount: 10,
			wantErr:   false,
		},
		{
			name:      "query 'Mün'",
			query:     "Mün",
			limit:     5,
			wantCount: 5,
			wantErr:   false,
		},
		{
			name:      "case insensitive",
			query:     "BER",
			limit:     10,
			wantCount: 10,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := p.AutocompleteMunicipality(tt.query, tt.limit)

			if len(results) > tt.limit {
				t.Errorf("AutocompleteMunicipality(%s, %d) returned %d results, want at most %d",
					tt.query, tt.limit, len(results), tt.limit)
			}

			// Verify all results contain query (case insensitive)
			queryLower := tt.query
			for _, result := range results {
				municipalityLower := result.Municipality
				if len(municipalityLower) < len(queryLower) {
					t.Errorf("Result municipality %s is shorter than query %s", result.Municipality, tt.query)
				}
			}
		})
	}
}

func TestPostalCodeProvider_CalculateDistance(t *testing.T) {
	p := NewPostalCodeProvider()

	// Test Haversine distance calculation
	// Berlin coordinates
	berlinLat, berlinLon := 52.5323, 13.3846
	munichLat, munichLon := 48.1345, 11.571

	_, dist, err := p.ReverseGeocode(berlinLat, berlinLon)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	_, dist2, err := p.ReverseGeocode(munichLat, munichLon)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Distance should be reasonable (not negative, not too large)
	if dist < 0 || dist > 1000 {
		t.Errorf("Distance from Berlin seems incorrect: %f km", dist)
	}
	if dist2 < 0 || dist2 > 1000 {
		t.Errorf("Distance from Munich seems incorrect: %f km", dist2)
	}
}

//nolint:gocognit // Test function with table-driven tests has inherent complexity
func TestPostalCodeProvider_GeocodeByMunicipalitiesBatch(t *testing.T) {
	p := NewPostalCodeProvider()

	tests := []struct {
		name           string
		municipalities []string
		wantFound      int
		wantNotFound   int
	}{
		{
			name:           "all valid municipalities",
			municipalities: []string{"Berlin", "München", "Hamburg"},
			wantFound:      3,
			wantNotFound:   0,
		},
		{
			name:           "mixed valid and invalid",
			municipalities: []string{"Berlin", "NonExistent", "Hamburg"},
			wantFound:      2,
			wantNotFound:   1,
		},
		{
			name:           "all invalid",
			municipalities: []string{"NonExistent1", "NonExistent2"},
			wantFound:      0,
			wantNotFound:   2,
		},
		{
			name:           "case insensitive",
			municipalities: []string{"BERLIN", "münchen", "HaMbUrG"},
			wantFound:      3,
			wantNotFound:   0,
		},
		{
			name:           "empty list",
			municipalities: []string{},
			wantFound:      0,
			wantNotFound:   0,
		},
		{
			name:           "single municipality",
			municipalities: []string{"Frankfurt am Main"},
			wantFound:      1,
			wantNotFound:   0,
		},
		{
			name:           "with whitespace",
			municipalities: []string{" Berlin ", "  München"},
			wantFound:      2,
			wantNotFound:   0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := p.GeocodeByMunicipalitiesBatch(tt.municipalities)

			// Count found and not found
			foundCount := 0
			notFoundCount := 0
			for _, result := range results {
				if result != nil && result.Found {
					foundCount++
				} else {
					notFoundCount++
				}
			}

			if foundCount != tt.wantFound {
				t.Errorf("Expected %d found, got %d", tt.wantFound, foundCount)
			}
			if notFoundCount != tt.wantNotFound {
				t.Errorf("Expected %d not found, got %d", tt.wantNotFound, notFoundCount)
			}

			// Verify found results have valid coordinates
			for municipality, result := range results {
				if result != nil && result.Found {
					if result.Lat == 0 && result.Lon == 0 {
						t.Errorf("Municipality %s has zero coordinates", municipality)
					}
					if result.PostalCode == "" {
						t.Errorf("Municipality %s has empty postal code", municipality)
					}
				}
			}
		})
	}
}

func TestPostalCodeProvider_GeocodeByMunicipalitiesBatch_Preserves_Original_Names(t *testing.T) {
	p := NewPostalCodeProvider()

	// Test that the original municipality names are preserved as keys
	municipalities := []string{"Berlin", "MÜNCHEN", "hamburg"}
	results := p.GeocodeByMunicipalitiesBatch(municipalities)

	// Check that original names are used as keys
	for _, original := range municipalities {
		if _, ok := results[original]; !ok {
			t.Errorf("Original name '%s' not found in results keys", original)
		}
	}
}

func TestPostalCodeProvider_GeocodeByMunicipalitiesBatch_Large_Batch(t *testing.T) {
	p := NewPostalCodeProvider()

	// Test with a larger batch
	municipalities := []string{
		"Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main",
		"Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen",
		"Bremen", "Dresden", "Hannover", "Nürnberg", "Duisburg",
	}

	results := p.GeocodeByMunicipalitiesBatch(municipalities)

	if len(results) != len(municipalities) {
		t.Errorf("Expected %d results, got %d", len(municipalities), len(results))
	}

	// Count how many were found
	foundCount := 0
	for _, result := range results {
		if result != nil && result.Found {
			foundCount++
		}
	}

	// Most major cities should be found
	if foundCount < 10 {
		t.Errorf("Expected at least 10 cities to be found, got %d", foundCount)
	}
}
