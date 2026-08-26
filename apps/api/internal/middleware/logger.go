package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// Logger returns a Fiber middleware that logs request and response information
// using structured zap logging. It records method, path, status code, latency,
// and the request ID for distributed tracing.
func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process the request
		err := c.Next()

		latency := time.Since(start)
		status := c.Response().StatusCode()
		reqID, _ := c.Locals(RequestIDKey).(string)

		// Build structured log fields
		fields := []zap.Field{
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.String("request_id", reqID),
			zap.String("ip", c.IP()),
			zap.String("user_agent", c.Get("User-Agent")),
		}

		// Use appropriate log level based on status code
		switch {
		case status >= 500:
			logger.L().Error("request completed", fields...)
		case status >= 400:
			logger.L().Warn("request completed", fields...)
		default:
			logger.L().Info("request completed", fields...)
		}

		return err
	}
}
