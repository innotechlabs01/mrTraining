// Package errors provides custom application error types with HTTP status codes
// and structured error responses following the MR Training API specification.
package errors

import (
	"fmt"
	"net/http"
)

// AppError represents a structured application error with a code, message,
// and HTTP status code suitable for API responses.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// New creates a new AppError with the given code, message, and HTTP status.
func New(code string, message string, status int) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}

// NotFound returns a 404 error for a resource that could not be found.
func NotFound(resource, identifier string) *AppError {
	return New(
		"NOT_FOUND",
		fmt.Sprintf("%s with identifier '%s' not found", resource, identifier),
		http.StatusNotFound,
	)
}

// Unauthorized returns a 401 error for missing or invalid authentication.
func Unauthorized(message string) *AppError {
	if message == "" {
		message = "authentication required"
	}
	return New("UNAUTHENTICATED", message, http.StatusUnauthorized)
}

// Forbidden returns a 403 error for insufficient permissions.
func Forbidden(message string) *AppError {
	if message == "" {
		message = "insufficient permissions"
	}
	return New("FORBIDDEN", message, http.StatusForbidden)
}

// BadRequest returns a 400 error for malformed or invalid requests.
func BadRequest(message string) *AppError {
	return New("BAD_REQUEST", message, http.StatusBadRequest)
}

// Conflict returns a 409 error for state conflicts.
func Conflict(message string) *AppError {
	return New("CONFLICT", message, http.StatusConflict)
}

// Internal returns a 500 error for unexpected server failures.
func Internal(message string) *AppError {
	if message == "" {
		message = "internal server error"
	}
	return New("INTERNAL_ERROR", message, http.StatusInternalServerError)
}

// ValidationFailed returns a 422 error for request validation failures.
func ValidationFailed(message string) *AppError {
	return New("VALIDATION_FAILED", message, http.StatusUnprocessableEntity)
}
