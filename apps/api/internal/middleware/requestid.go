package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	// RequestIDHeader is the header name used for request identification.
	RequestIDHeader = "X-Request-ID"
	// RequestIDKey is the key used to store the request ID in Fiber locals.
	RequestIDKey = "request_id"
)

// RequestID returns a Fiber middleware that ensures every request has a unique
// identifier. If the client provides an X-Request-ID header, it is used as-is.
// Otherwise, a new UUID v4 is generated. The request ID is added to the response
// headers and stored in Fiber context locals for downstream use.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if client provided a request ID
		reqID := c.Get(RequestIDHeader)

		// Generate one if not provided
		if reqID == "" {
			reqID = uuid.New().String()
		}

		// Store in context locals for logging and error responses
		c.Locals(RequestIDKey, reqID)

		// Add to response header
		c.Set(RequestIDHeader, reqID)

		return c.Next()
	}
}
