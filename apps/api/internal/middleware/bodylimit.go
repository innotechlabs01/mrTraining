package middleware

import "github.com/gofiber/fiber/v2"

// BodyLimit returns middleware that rejects requests whose body exceeds the
// specified size. The check uses the Content-Length header, which is efficient
// (no body parsing) and covers the vast majority of HTTP clients.
//
// For chunked transfer-encoding requests without Content-Length, the server-level
// BodyLimit configured on the Fiber app serves as the fallback safety net.
//
// maxMB is the maximum allowed body size in megabytes.
func BodyLimit(maxMB int) fiber.Handler {
	maxBytes := maxMB * 1024 * 1024

	return func(c *fiber.Ctx) error {
		contentLength := c.Context().Request.Header.ContentLength()

		// Content-Length of 0 or -1 means absent or unknown — allow the
		// request and let the server-level body limit handle it.
		if contentLength > 0 && contentLength > maxBytes {
			return fiber.NewError(
				fiber.StatusRequestEntityTooLarge,
				"request body exceeds maximum allowed size",
			)
		}

		return c.Next()
	}
}
