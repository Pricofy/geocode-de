// Package logger provides structured logging for CloudWatch Insights.
// Logs are formatted as JSON for easy querying and analysis.
package logger

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// Logger provides structured logging capabilities.
// All logs are written to stdout in JSON format for CloudWatch Insights.
type Logger struct {
	component string
}

// LogEntry represents a structured log entry.
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Component string                 `json:"component"`
	Message   string                 `json:"message"`
	Error     string                 `json:"error,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// NewLogger creates a new Logger instance.
//
// Parameters:
//   - component: Component name (e.g., "GeocodeES", "PostalCodeService")
//
// Returns:
//   - *Logger: Initialized logger instance
func NewLogger(component string) *Logger {
	return &Logger{
		component: component,
	}
}

// Info logs an informational message.
//
// Parameters:
//   - message: Log message
//   - data: Optional structured data (key-value pairs)
func (l *Logger) Info(message string, data map[string]interface{}) {
	l.log("INFO", message, "", data)
}

// Warn logs a warning message.
//
// Parameters:
//   - message: Log message
//   - data: Optional structured data (key-value pairs)
func (l *Logger) Warn(message string, data map[string]interface{}) {
	l.log("WARN", message, "", data)
}

// Error logs an error message.
//
// Parameters:
//   - message: Log message
//   - err: Error object
//   - data: Optional structured data (key-value pairs)
func (l *Logger) Error(message string, err error, data map[string]interface{}) {
	errorMsg := ""
	if err != nil {
		errorMsg = err.Error()
	}
	l.log("ERROR", message, errorMsg, data)
}

// Debug logs a debug message.
//
// Parameters:
//   - message: Log message
//   - data: Optional structured data (key-value pairs)
func (l *Logger) Debug(message string, data map[string]interface{}) {
	l.log("DEBUG", message, "", data)
}

// log writes a structured log entry to stdout.
func (l *Logger) log(level, message, errorMsg string, data map[string]interface{}) {
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Level:     level,
		Component: l.component,
		Message:   message,
		Error:     errorMsg,
		Data:      data,
	}

	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		// Fallback to plain text if JSON marshaling fails
		log.Printf("[%s] %s: %s - %v", level, l.component, message, data)
		return
	}

	fmt.Println(string(jsonBytes))
}

