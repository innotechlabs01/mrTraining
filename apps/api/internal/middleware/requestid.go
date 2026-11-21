package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

const (
	// RequestIDHeader is the header name used for request identification.
	RequestIDHeader = "X-Request-ID"
	// CorrelationIDHeader is the distributed correlation header propagated into NATS events.
	CorrelationIDHeader = "X-Correlation-ID"
	// RequestIDKey is the key used to store the request ID in Fiber locals.
	RequestIDKey = "request_id"
)

// RequestID ensures every request has a unique correlation/request identifier,
// stores it in Fiber locals, propagates it into UserContext via pkg/telemetry,
// and echoes it back on X-Request-ID and X-Correlation-ID headers.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		reqID := c.Get(CorrelationIDHeader)
		if reqID == "" {
			reqID = c.Get(RequestIDHeader)
		}
		if reqID == "" {
			reqID = uuid.New().String()
		}

		c.Locals(RequestIDKey, reqID)
		c.SetUserContext(telemetry.WithCorrelationID(c.UserContext(), reqID))

		c.Set(RequestIDHeader, reqID)
		c.Set(CorrelationIDHeader, reqID)

		return c.Next()
	}
}
