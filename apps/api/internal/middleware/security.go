// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import "github.com/gofiber/fiber/v2"

// SecurityHeaders returns middleware that sets security-related HTTP headers
// on every response. These headers mitigate common web vulnerabilities:
// clickjacking, MIME sniffing, XSS, and protocol downgrade attacks.
//
// The Server header is explicitly removed to avoid information disclosure.
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Prevent MIME type sniffing.
		c.Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking — page cannot be embedded in iframes.
		c.Set("X-Frame-Options", "DENY")

		// Legacy XSS protection (deprecated in favor of CSP, but still
		// useful for older browsers that support it).
		c.Set("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS for one year, including subdomains.
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Control referrer information leakage across origins.
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Restrict browser features — no camera, microphone, or geolocation.
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		// Remove Server header to avoid revealing server technology.
		c.Set("Server", "")

		return c.Next()
	}
}
