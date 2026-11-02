// Package response provides standardized JSON response helpers for the MR Training API.
// All API endpoints should use these helpers to ensure consistent response formatting.
package response

import (
	"github.com/gofiber/fiber/v2"
)

// ErrorResponse represents a structured API error response.
type ErrorResponse struct {
	Error     ErrorDetail `json:"error"`
	RequestID string      `json:"request_id,omitempty"`
}

// ErrorDetail contains the error code and human-readable message.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSON sends a response with the given status code and data payload.
// This is the base helper; prefer Success and Error for most endpoints.
func JSON(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(data)
}

// Error sends a structured error response following the API specification.
// It includes the request ID from context when available.
func Error(c *fiber.Ctx, status int, message string) error {
	code := httpStatusToCode(status)
	reqID, _ := c.Locals("request_id").(string)

	return c.Status(status).JSON(ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
		RequestID: reqID,
	})
}

// Success sends a 200 OK response with the given data payload.
func Success(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(data)
}

// httpStatusToCode maps HTTP status codes to stable machine-readable error codes.
func httpStatusToCode(status int) string {
	switch status {
	case fiber.StatusBadRequest:
		return "BAD_REQUEST"
	case fiber.StatusUnauthorized:
		return "UNAUTHENTICATED"
	case fiber.StatusForbidden:
		return "FORBIDDEN"
	case fiber.StatusNotFound:
		return "NOT_FOUND"
	case fiber.StatusConflict:
		return "CONFLICT"
	case fiber.StatusTooManyRequests:
		return "RATE_LIMITED"
	case fiber.StatusUnprocessableEntity:
		return "VALIDATION_FAILED"
	case fiber.StatusInternalServerError:
		return "INTERNAL_ERROR"
	case fiber.StatusServiceUnavailable:
		return "SERVICE_UNAVAILABLE"
	default:
		return "ERROR"
	}
}
