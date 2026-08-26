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
// handlers can check for cancellation via ctx.Err().
func Timeout(seconds int) fiber.Handler {
	duration := time.Duration(seconds) * time.Second

	return func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), duration)
		defer cancel()
		c.SetUserContext(ctx)

		// Run the next handler in a goroutine so we can enforce the deadline.
		// The goroutine will be cleaned up when the connection closes or the
		// handler completes — Fasthttp manages connection lifecycle.
		done := make(chan error, 1)
		go func() {
			done <- c.Next()
		}()

		select {
		case <-ctx.Done():
			// Context deadline exceeded — handler took too long.
			return fiber.NewError(
				fiber.StatusLoopDetected,
				"request timeout exceeded",
			)
		case err := <-done:
			return err
		}
	}
}
