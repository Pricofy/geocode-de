package logger

import (
	"errors"
	"testing"
)

// TestNewLogger verifies logger initialization.
func TestNewLogger(t *testing.T) {
	logger := NewLogger("TestComponent")

	if logger == nil {
		t.Fatal("NewLogger() returned nil")
	}

	if logger.component != "TestComponent" {
		t.Errorf("Expected component 'TestComponent', got '%s'", logger.component)
	}
}

// TestLogger_Info tests Info logging.
func TestLogger_Info(t *testing.T) {
	logger := NewLogger("TestComponent")

	// Should not panic
	logger.Info("Test message", map[string]interface{}{
		"key": "value",
	})

	// Should handle nil data
	logger.Info("Test message", nil)
}

// TestLogger_Warn tests Warn logging.
func TestLogger_Warn(t *testing.T) {
	logger := NewLogger("TestComponent")

	// Should not panic
	logger.Warn("Warning message", map[string]interface{}{
		"key": "value",
	})
}

// TestLogger_Error tests Error logging.
func TestLogger_Error(t *testing.T) {
	logger := NewLogger("TestComponent")

	// Should not panic
	logger.Error("Error message", errors.New("test error"), map[string]interface{}{
		"key": "value",
	})

	// Should handle nil error
	logger.Error("Error message", nil, nil)
}

// TestLogger_Debug tests Debug logging.
func TestLogger_Debug(t *testing.T) {
	logger := NewLogger("TestComponent")

	// Should not panic
	logger.Debug("Debug message", map[string]interface{}{
		"key": "value",
	})
}

