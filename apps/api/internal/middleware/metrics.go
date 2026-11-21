package middleware

import (
	"crypto/subtle"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
)

// Metrics records normalized HTTP request counts and latency histograms
// using Fiber's matched route template (never high-cardinality raw paths).
func Metrics() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		routePath := "unmatched"
		if r := c.Route(); r != nil && r.Path != "" {
			routePath = r.Path
		}
		status := c.Response().StatusCode()
		if err != nil && status < 400 {
			if fe, ok := err.(*fiber.Error); ok {
				status = fe.Code
			} else {
				status = fiber.StatusInternalServerError
			}
		}

		statusStr := strconv.Itoa(status)
		metrics.HTTPRequestsTotal.Inc(c.Method(), routePath, statusStr)
		metrics.HTTPRequestDurationSeconds.Observe(time.Since(start).Seconds(), c.Method(), routePath)
		return err
	}
}

// MetricsHandler exposes Prometheus exposition text format on GET /metrics.
// When token is non-empty, callers must present it via Authorization: Bearer <token>
// or X-Metrics-Token header.
func MetricsHandler(token string) fiber.Handler {
	metrics.RegisterDefaultCollectors()
	return func(c *fiber.Ctx) error {
		if token != "" {
			provided := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
			if provided == c.Get("Authorization") || provided == "" {
				provided = c.Get("X-Metrics-Token")
			}
			if len(provided) != len(token) || subtle.ConstantTimeCompare([]byte(provided), []byte(token)) != 1 {
				return c.Status(fiber.StatusUnauthorized).SendString("unauthorized\n")
			}
		}
		c.Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		return c.SendString(metrics.DefaultRegistry.Render())
	}
}
