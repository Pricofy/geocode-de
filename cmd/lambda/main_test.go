package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/pricofy/geocode-es/internal/domain"
)

// TestNewApp verifies that the App can be initialized successfully.
func TestNewApp(t *testing.T) {
	app, err := NewApp()

	if err != nil {
		t.Fatalf("NewApp() failed: %v", err)
	}

	if app == nil {
		t.Fatal("NewApp() returned nil app")
	}

	if app.service == nil {
		t.Fatal("App.service is nil")
	}

	if app.logger == nil {
		t.Fatal("App.logger is nil")
	}
}

// TestHandler_GeocodeByPostal tests the geocode-by-postal operation.
func TestHandler_GeocodeByPostal(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"geocode-by-postal","postalCode":"28001"}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}

	var body map[string]interface{}
	if err := json.Unmarshal([]byte(response.Body), &body); err != nil {
		t.Fatalf("Failed to parse response body: %v", err)
	}

	if success, ok := body["success"].(bool); !ok || !success {
		t.Errorf("Expected success=true, got %v", body["success"])
	}
}

// TestHandler_ReverseGeocode tests the reverse-geocode operation.
func TestHandler_ReverseGeocode(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"reverse-geocode","lat":40.4168,"lon":-3.7038}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}
}

// TestHandler_ValidatePostal tests the validate-postal operation.
func TestHandler_ValidatePostal(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"validate-postal","postalCode":"28001"}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}
}

// TestHandler_ValidateMunicipio tests the validate-municipio operation.
func TestHandler_ValidateMunicipio(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"validate-municipio","municipio":"Madrid"}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}
}

// TestHandler_AutocompletePostal tests the autocomplete-postal operation.
func TestHandler_AutocompletePostal(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"autocomplete-postal","prefix":"280","limit":10}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}
}

// TestHandler_AutocompleteMunicipio tests the autocomplete-municipio operation.
func TestHandler_AutocompleteMunicipio(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"autocomplete-municipio","query":"mad","limit":10}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}
}

// TestHandler_UnknownOperation tests handling of unknown operations.
func TestHandler_UnknownOperation(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"unknown-operation"}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 400 {
		t.Errorf("Expected status 400, got %d", response.StatusCode)
	}

	var body map[string]interface{}
	if err := json.Unmarshal([]byte(response.Body), &body); err != nil {
		t.Fatalf("Failed to parse response body: %v", err)
	}

	if success, ok := body["success"].(bool); !ok || success {
		t.Errorf("Expected success=false, got %v", body["success"])
	}
}

// TestHandler_InvalidJSON tests handling of invalid JSON.
func TestHandler_InvalidJSON(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{invalid json}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 400 {
		t.Errorf("Expected status 400, got %d", response.StatusCode)
	}
}

// TestHandler_NotFound tests 404 error handling.
func TestHandler_NotFound(t *testing.T) {
	ctx := context.Background()
	event := domain.LambdaEvent{
		Body: `{"operation":"geocode-by-postal","postalCode":"99999"}`,
	}

	response, err := Handler(ctx, event)

	if err != nil {
		t.Fatalf("Handler() failed: %v", err)
	}

	if response.StatusCode != 404 {
		t.Errorf("Expected status 404, got %d", response.StatusCode)
	}
}

