package middleware

import (
	"fmt"
	"runtime/debug"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// Recover returns middleware that recovers from panics and logs them with
// a full stack trace. It wraps Fiber's built-in panic recovery behavior
// with structured zap logging so panics are visible in log aggregation.
//
// The middleware converts the panic value into a 500 Internal Server Error
// response, preventing the panic from crashing the server process.
func Recover() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				// Capture the stack trace for debugging.
				stack := debug.Stack()

				logger.L().Error("panic recovered",
					zap.String("method", c.Method()),
					zap.String("path", c.Path()),
					zap.String("ip", c.IP()),
					zap.String("panic", fmt.Sprintf("%v", r)),
					zap.String("stack", string(stack)),
				)

				// Return a safe error response — never expose panic details.
				_ = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fiber.Map{
						"code":    "INTERNAL_ERROR",
						"message": "internal server error",
					},
				})
			}
		}()

		return c.Next()
	}
}
