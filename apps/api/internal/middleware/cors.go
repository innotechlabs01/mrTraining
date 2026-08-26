// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// CORS returns a Fiber middleware that handles Cross-Origin Resource Sharing.
// It reads allowed origins from the provided comma-separated origins string
// and configures the appropriate headers for browser-based requests.
func CORS(allowedOrigins string) fiber.Handler {
	origins := parseOrigins(allowedOrigins)

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// In development with wildcard, allow all origins
		if allowedOrigins == "*" {
			c.Set("Access-Control-Allow-Origin", "*")
		} else if isOriginAllowed(origin, origins) {
			c.Set("Access-Control-Allow-Origin", origin)
			c.Set("Access-Control-Allow-Credentials", "true")
		} else if len(origins) > 0 {
			// Set the first allowed origin as fallback
			c.Set("Access-Control-Allow-Origin", origins[0])
			c.Set("Access-Control-Allow-Credentials", "true")
		}

		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-Organization-ID")
		c.Set("Access-Control-Expose-Headers", "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset")
		c.Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}

// parseOrigins splits a comma-separated origins string into a slice.
func parseOrigins(raw string) []string {
	if raw == "" || raw == "*" {
		return []string{"*"}
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

// isOriginAllowed checks whether the given origin is in the allowed list.
func isOriginAllowed(origin string, allowed []string) bool {
	if origin == "" {
		return false
	}
	for _, a := range allowed {
		if a == "*" || a == origin {
			return true
		}
	}
	return false
}
