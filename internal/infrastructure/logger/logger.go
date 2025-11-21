package logger

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// LogLevel represents the severity level of a log entry.
type LogLevel string

const (
	// LogLevelDEBUG is for detailed debugging information (only logged when LOG_LEVEL=DEBUG).
	LogLevelDEBUG LogLevel = "DEBUG"
	// LogLevelINFO is for informational messages for normal operations.
	LogLevelINFO LogLevel = "INFO"
	// LogLevelWARN is for warning messages for recoverable issues.
	LogLevelWARN LogLevel = "WARN"
	// LogLevelERROR is for error messages for failures and exceptions.
	LogLevelERROR LogLevel = "ERROR"
)

// LogEntry represents a structured log entry compatible with CloudWatch Insights.
type LogEntry struct {
	Level     LogLevel              `json:"level"`
	Component string                `json:"component"`
	Message   string                `json:"message"`
	Timestamp string                `json:"timestamp"`
	Error     *ErrorDetails         `json:"error,omitempty"`
	Metadata  map[string]interface{} `json:"-"`
}

// ErrorDetails contains structured error information.
type ErrorDetails struct {
	Message string `json:"message"`
	Stack   string `json:"stack,omitempty"`
	Name    string `json:"name,omitempty"`
}

// Logger provides structured logging functionality.
// All logs are JSON-formatted for CloudWatch Insights compatibility.
type Logger struct{}

// NewLogger creates a new Logger instance.
func NewLogger() *Logger {
	return &Logger{}
}

// hashIP hashes an IP address for privacy-compliant logging (GDPR).
// Returns first 8 chars of SHA-256 hash.
// In DEBUG mode, returns original IP for development troubleshooting.
func hashIP(ip string) string {
	if os.Getenv("LOG_LEVEL") == "DEBUG" {
		return ip
	}

	hash := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(hash[:])[:8]
}

// sanitizeMetadata recursively searches for 'ip' fields in metadata and hashes them.
// Preserves all other fields unchanged.
func sanitizeMetadata(metadata map[string]interface{}) map[string]interface{} {
	if metadata == nil {
		return nil
	}

	sanitized := make(map[string]interface{})
	for k, v := range metadata {
		if k == "ip" {
			if ipStr, ok := v.(string); ok {
				sanitized[k] = hashIP(ipStr)
			} else {
				sanitized[k] = v
			}
		} else {
			sanitized[k] = v
		}
	}

	return sanitized
}

// log writes a structured log entry to the appropriate output stream.
// ERROR/WARN → stderr, INFO/DEBUG → stdout.
func (l *Logger) log(level LogLevel, component, message string, metadata map[string]interface{}, errDetails *ErrorDetails) {
	entryMap := map[string]interface{}{
		"level":     level,
		"component": component,
		"message":   message,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	if errDetails != nil {
		entryMap["error"] = errDetails
	}

	if metadata != nil {
		sanitized := sanitizeMetadata(metadata)
		for k, v := range sanitized {
			entryMap[k] = v
		}
	}

	entryJSON, _ := json.Marshal(entryMap)
	output := string(entryJSON)

	switch level {
	case LogLevelERROR:
		fmt.Fprintln(os.Stderr, output)
	case LogLevelWARN:
		fmt.Fprintln(os.Stderr, output)
	default:
		fmt.Println(output)
	}
}

// Debug logs a debug message (only when LOG_LEVEL=DEBUG).
func (l *Logger) Debug(component, message string, metadata map[string]interface{}) {
	if os.Getenv("LOG_LEVEL") == "DEBUG" {
		l.log(LogLevelDEBUG, component, message, metadata, nil)
	}
}

// Info logs an informational message.
func (l *Logger) Info(component, message string, metadata map[string]interface{}) {
	l.log(LogLevelINFO, component, message, metadata, nil)
}

// Warn logs a warning message.
func (l *Logger) Warn(component, message string, metadata map[string]interface{}) {
	l.log(LogLevelWARN, component, message, metadata, nil)
}

// Error logs an error message with error details.
func (l *Logger) Error(component, message string, err error, metadata map[string]interface{}) {
	var errDetails *ErrorDetails
	if err != nil {
		errDetails = &ErrorDetails{
			Message: err.Error(),
		}
		// Try to extract stack trace if available
		if stackErr, ok := err.(interface{ StackTrace() string }); ok {
			errDetails.Stack = stackErr.StackTrace()
		}
		// Extract error type name
		errDetails.Name = fmt.Sprintf("%T", err)
	}

	l.log(LogLevelERROR, component, message, metadata, errDetails)
}

// Default logger instance for package-level convenience.
var defaultLogger = NewLogger()

// Debug logs a debug message using the default logger.
func Debug(component, message string, metadata map[string]interface{}) {
	defaultLogger.Debug(component, message, metadata)
}

// Info logs an informational message using the default logger.
func Info(component, message string, metadata map[string]interface{}) {
	defaultLogger.Info(component, message, metadata)
}

// Warn logs a warning message using the default logger.
func Warn(component, message string, metadata map[string]interface{}) {
	defaultLogger.Warn(component, message, metadata)
}

// Error logs an error message using the default logger.
func Error(component, message string, err error, metadata map[string]interface{}) {
	defaultLogger.Error(component, message, err, metadata)
}

