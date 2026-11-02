package middleware

import (
	"strconv"
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
		// Skip logging for filtered paths
		if ShouldLogPath(c.Path()) == false {
			return c.Next()
		}

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

		// Add user context if available
		if userID := getUserID(c); userID != "" {
			fields = append(fields, zap.String("user_id", userID))
		}

		// Use appropriate log level based on status code
		msg := formatLogMessage(c.Method(), c.Path(), status, latency)
		switch {
		case status >= 500:
			logger.L().Error(msg, fields...)
		case status >= 400:
			logger.L().Warn(msg, fields...)
		default:
			logger.L().Info(msg, fields...)
		}

		return err
	}
}

// getUserID extracts user ID from context (if auth middleware ran)
func getUserID(c *fiber.Ctx) string {
	if uid := c.Locals("user_id"); uid != nil {
		if s, ok := uid.(string); ok {
			return s
		}
	}
	return ""
}

// formatLogMessage creates a concise human-readable log message
func formatLogMessage(method, path string, status int, latency time.Duration) string {
	statusColor := statusColor(status)
	latencyStr := formatLatency(latency)
	
	// Truncate long paths for readability
	displayPath := path
	if len(displayPath) > 60 {
		displayPath = displayPath[:57] + "..."
	}
	
	return "HTTP " + method + " " + displayPath + " " + statusColor + " " + latencyStr
}

func statusColor(status int) string {
	switch {
	case status >= 500:
		return "🔴 " + strconv.Itoa(status)
	case status >= 400:
		return "🟡 " + strconv.Itoa(status)
	case status >= 300:
		return "🔵 " + strconv.Itoa(status)
	default:
		return "🟢 " + strconv.Itoa(status)
	}
}

func formatLatency(d time.Duration) string {
	if d < time.Millisecond {
		return "<1ms"
	}
	if d < time.Second {
		return d.Round(time.Microsecond).String()
	}
	return d.Round(time.Millisecond).String()
}

// FilterPaths defines paths to exclude from request logging (health checks, etc.)
var FilterPaths = map[string]bool{
	"/health":           true,
	"/health/live":      true,
	"/health/ready":     true,
	"/favicon.ico":      true,
	"/robots.txt":       true,
}

// ShouldLogPath returns true if the path should be logged
func ShouldLogPath(path string) bool {
	return !FilterPaths[path]
}
