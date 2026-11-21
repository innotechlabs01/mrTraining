package middleware

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Timeout returns middleware that enforces a maximum duration for request handling.
// If the downstream handler does not complete within the specified number of seconds,
// the request is cancelled and a 504 Gateway Timeout response is returned.
//
// The middleware sets a context.WithTimeout on the user context so downstream
// handlers can check for cancellation via RequestContext(c) / c.UserContext().
// Executing c.Next() synchronously ensures that Fiber/fasthttp's *fiber.Ctx is not
// accessed concurrently across goroutines, preventing data races when deadlines expire.
func Timeout(seconds int) fiber.Handler {
	duration := time.Duration(seconds) * time.Second

	return func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), duration)
		defer cancel()
		c.SetUserContext(ctx)

		err := c.Next()
		if ctx.Err() != nil {
			return fiber.NewError(
				fiber.StatusGatewayTimeout,
				"request timeout exceeded",
			)
		}
		return err
	}
}

// RequestContext returns the request context enriched with middleware deadlines
// (c.UserContext()), falling back to c.Context() if UserContext is nil.
func RequestContext(c *fiber.Ctx) context.Context {
	if c == nil {
		return context.Background()
	}
	if ctx := c.UserContext(); ctx != nil {
		return ctx
	}
	return c.Context()
}
