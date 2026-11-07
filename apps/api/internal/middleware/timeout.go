package middleware

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Timeout returns middleware that enforces a maximum duration for request handling.
// If the downstream handler does not complete within the specified number of seconds,
// the request is cancelled and a 508 Loop Detected response is returned.
//
// The middleware sets a context.WithTimeout on the user context so downstream
// handlers can check for cancellation via ctx.Err(). Executing c.Next() synchronously
// ensures that Fiber/fasthttp's *fiber.Ctx is not accessed concurrently across goroutines,
// preventing data races when context deadlines expire.
func Timeout(seconds int) fiber.Handler {
	duration := time.Duration(seconds) * time.Second

	return func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), duration)
		defer cancel()
		c.SetUserContext(ctx)

		err := c.Next()
		if ctx.Err() != nil {
			return fiber.NewError(
				fiber.StatusLoopDetected,
				"request timeout exceeded",
			)
		}
		return err
	}
}
