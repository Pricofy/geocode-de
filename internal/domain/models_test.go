package domain

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPostalData_JSONSerialization tests JSON marshaling/unmarshaling of PostalData.
func TestPostalData_JSONSerialization(t *testing.T) {
	tests := []struct {
		name     string
		data     PostalData
		expected string
	}{
		{
			name: "Valid postal data",
			data: PostalData{
				Lat:       40.4168,
				Lon:       -3.7038,
				Municipio: "Madrid",
				Provincia: "Madrid",
			},
			expected: `{"lat":40.4168,"lon":-3.7038,"municipio":"Madrid","provincia":"Madrid"}`,
		},
		{
			name: "Zero coordinates",
			data: PostalData{
				Lat:       0.0,
				Lon:       0.0,
				Municipio: "Test",
				Provincia: "Test",
			},
			expected: `{"lat":0,"lon":0,"municipio":"Test","provincia":"Test"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Marshal
			jsonData, err := json.Marshal(tt.data)
			require.NoError(t, err)
			assert.JSONEq(t, tt.expected, string(jsonData))

			// Unmarshal
			var unmarshaled PostalData
			err = json.Unmarshal(jsonData, &unmarshaled)
			require.NoError(t, err)
			assert.Equal(t, tt.data, unmarshaled)
		})
	}
}

// TestCoordinates_JSONSerialization tests JSON marshaling/unmarshaling of Coordinates.
func TestCoordinates_JSONSerialization(t *testing.T) {
	coords := Coordinates{Lat: 40.4168, Lon: -3.7038}
	jsonData, err := json.Marshal(coords)
	require.NoError(t, err)

	var unmarshaled Coordinates
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)
	assert.Equal(t, coords, unmarshaled)
}

// TestGeocodingResult_JSONSerialization tests JSON marshaling/unmarshaling of GeocodingResult.
func TestGeocodingResult_JSONSerialization(t *testing.T) {
	result := GeocodingResult{
		Success:    true,
		Coords:     Coordinates{Lat: 40.4168, Lon: -3.7038},
		Municipio:  "Madrid",
		Provincia:  "Madrid",
		PostalCode: "28001",
		Source:     "postal_code",
	}

	jsonData, err := json.Marshal(result)
	require.NoError(t, err)

	var unmarshaled GeocodingResult
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)
	assert.Equal(t, result, unmarshaled)
}

// TestReverseGeocodingResult_JSONSerialization tests JSON marshaling/unmarshaling of ReverseGeocodingResult.
func TestReverseGeocodingResult_JSONSerialization(t *testing.T) {
	result := ReverseGeocodingResult{
		Success:    true,
		City:       "Madrid",
		PostalCode: "28001",
		Provincia:  "Madrid",
		Country:    "España",
		Coords:     Coordinates{Lat: 40.4168, Lon: -3.7038},
		Distance:   0.5,
	}

	jsonData, err := json.Marshal(result)
	require.NoError(t, err)

	var unmarshaled ReverseGeocodingResult
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)
	assert.Equal(t, result, unmarshaled)
}

// TestAutocompleteResult_JSONSerialization tests JSON marshaling/unmarshaling of AutocompleteResult.
func TestAutocompleteResult_JSONSerialization(t *testing.T) {
	result := AutocompleteResult{
		PostalCode: "28001",
		Municipio:  "Madrid",
		Provincia:  "Madrid",
	}

	jsonData, err := json.Marshal(result)
	require.NoError(t, err)

	var unmarshaled AutocompleteResult
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)
	assert.Equal(t, result, unmarshaled)
}

// TestValidationResult_JSONSerialization tests JSON marshaling/unmarshaling of ValidationResult.
func TestValidationResult_JSONSerialization(t *testing.T) {
	tests := []struct {
		name   string
		result ValidationResult
	}{
		{
			name:   "Valid result",
			result: ValidationResult{Valid: true, Value: "28001"},
		},
		{
			name:   "Invalid result",
			result: ValidationResult{Valid: false, Value: "99999"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jsonData, err := json.Marshal(tt.result)
			require.NoError(t, err)

			var unmarshaled ValidationResult
			err = json.Unmarshal(jsonData, &unmarshaled)
			require.NoError(t, err)
			assert.Equal(t, tt.result, unmarshaled)
		})
	}
}

// TestLambdaEvent_JSONSerialization tests JSON marshaling/unmarshaling of LambdaEvent.
func TestLambdaEvent_JSONSerialization(t *testing.T) {
	event := LambdaEvent{
		Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
	}

	jsonData, err := json.Marshal(event)
	require.NoError(t, err)

	var unmarshaled LambdaEvent
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)
	assert.Equal(t, event, unmarshaled)
}

// TestLambdaResponse_JSONSerialization tests JSON marshaling/unmarshaling of LambdaResponse.
func TestLambdaResponse_JSONSerialization(t *testing.T) {
	response := LambdaResponse{
		StatusCode: 200,
		Body:       `{"success":true}`,
	}

	jsonData, err := json.Marshal(response)
	require.NoError(t, err)

	var unmarshaled LambdaResponse
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)
	assert.Equal(t, response, unmarshaled)
}

// TestRequestBody_JSONSerialization tests JSON marshaling/unmarshaling of RequestBody.
func TestRequestBody_JSONSerialization(t *testing.T) {
	postalCode := "28001"
	municipio := "Madrid"
	lat := 40.4168
	lon := -3.7038
	prefix := "280"
	query := "mad"
	limit := 10

	tests := []struct {
		name string
		body RequestBody
	}{
		{
			name: "Geocode by postal",
			body: RequestBody{
				Operation:  "geocode-by-postal",
				PostalCode: &postalCode,
			},
		},
		{
			name: "Geocode by municipio",
			body: RequestBody{
				Operation: "geocode-by-postal",
				Municipio: &municipio,
			},
		},
		{
			name: "Reverse geocode",
			body: RequestBody{
				Operation: "reverse-geocode",
				Lat:       &lat,
				Lon:       &lon,
			},
		},
		{
			name: "Validate postal",
			body: RequestBody{
				Operation:  "validate-postal",
				PostalCode: &postalCode,
			},
		},
		{
			name: "Validate municipio",
			body: RequestBody{
				Operation: "validate-municipio",
				Municipio: &municipio,
			},
		},
		{
			name: "Autocomplete postal",
			body: RequestBody{
				Operation: "autocomplete-postal",
				Prefix:    &prefix,
				Limit:     &limit,
			},
		},
		{
			name: "Autocomplete municipio",
			body: RequestBody{
				Operation: "autocomplete-municipio",
				Query:     &query,
				Limit:     &limit,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Marshal
			jsonData, err := json.Marshal(tt.body)
			require.NoError(t, err)

			// Unmarshal
			var unmarshaled RequestBody
			err = json.Unmarshal(jsonData, &unmarshaled)
			require.NoError(t, err)
			assert.Equal(t, tt.body.Operation, unmarshaled.Operation)

			// Verify optional fields
			if tt.body.PostalCode != nil {
				require.NotNil(t, unmarshaled.PostalCode)
				assert.Equal(t, *tt.body.PostalCode, *unmarshaled.PostalCode)
			}
			if tt.body.Municipio != nil {
				require.NotNil(t, unmarshaled.Municipio)
				assert.Equal(t, *tt.body.Municipio, *unmarshaled.Municipio)
			}
			if tt.body.Lat != nil {
				require.NotNil(t, unmarshaled.Lat)
				assert.Equal(t, *tt.body.Lat, *unmarshaled.Lat)
			}
			if tt.body.Lon != nil {
				require.NotNil(t, unmarshaled.Lon)
				assert.Equal(t, *tt.body.Lon, *unmarshaled.Lon)
			}
			if tt.body.Prefix != nil {
				require.NotNil(t, unmarshaled.Prefix)
				assert.Equal(t, *tt.body.Prefix, *unmarshaled.Prefix)
			}
			if tt.body.Query != nil {
				require.NotNil(t, unmarshaled.Query)
				assert.Equal(t, *tt.body.Query, *unmarshaled.Query)
			}
			if tt.body.Limit != nil {
				require.NotNil(t, unmarshaled.Limit)
				assert.Equal(t, *tt.body.Limit, *unmarshaled.Limit)
			}
		})
	}
}

// TestRequestBody_OmitEmpty tests that omitempty works correctly for optional fields.
func TestRequestBody_OmitEmpty(t *testing.T) {
	body := RequestBody{
		Operation: "geocode-by-postal",
	}

	jsonData, err := json.Marshal(body)
	require.NoError(t, err)

	// Should only contain operation field
	expected := `{"operation":"geocode-by-postal"}`
	assert.JSONEq(t, expected, string(jsonData))
}

// TestGeocodingResult_SuccessField tests the success field behavior.
func TestGeocodingResult_SuccessField(t *testing.T) {
	tests := []struct {
		name    string
		success bool
	}{
		{"Success true", true},
		{"Success false", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GeocodingResult{Success: tt.success}
			jsonData, err := json.Marshal(result)
			require.NoError(t, err)

			var unmarshaled GeocodingResult
			err = json.Unmarshal(jsonData, &unmarshaled)
			require.NoError(t, err)
			assert.Equal(t, tt.success, unmarshaled.Success)
		})
	}
}

// TestReverseGeocodingResult_DistanceField tests distance field precision.
func TestReverseGeocodingResult_DistanceField(t *testing.T) {
	tests := []struct {
		name     string
		distance float64
	}{
		{"Zero distance", 0.0},
		{"Small distance", 0.123},
		{"Large distance", 123.456},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ReverseGeocodingResult{Distance: tt.distance}
			jsonData, err := json.Marshal(result)
			require.NoError(t, err)

			var unmarshaled ReverseGeocodingResult
			err = json.Unmarshal(jsonData, &unmarshaled)
			require.NoError(t, err)
			assert.InDelta(t, tt.distance, unmarshaled.Distance, 0.001)
		})
	}
}

