package middleware_test

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupSecurityTestApp creates a Fiber app with security headers middleware.
func setupSecurityTestApp() *fiber.App {
	app := fiber.New()
	app.Use(middleware.SecurityHeaders())

	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	return app
}

// TestSecurityHeaders_AllHeadersPresent verifies every expected header is set.
func TestSecurityHeaders_AllHeadersPresent(t *testing.T) {
	app := setupSecurityTestApp()

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	tests := []struct {
		header   string
		expected string
	}{
		{"X-Content-Type-Options", "nosniff"},
		{"X-Frame-Options", "DENY"},
		{"X-XSS-Protection", "1; mode=block"},
		{"Strict-Transport-Security", "max-age=31536000; includeSubDomains"},
		{"Referrer-Policy", "strict-origin-when-cross-origin"},
		{"Permissions-Policy", "camera=(), microphone=(), geolocation=()"},
	}

	for _, tt := range tests {
		t.Run(tt.header, func(t *testing.T) {
			got := resp.Header.Get(tt.header)
			if got != tt.expected {
				t.Errorf("header %s: expected %q, got %q", tt.header, tt.expected, got)
			}
		})
	}
}

// TestSecurityHeaders_ServerRemoved verifies the Server header is suppressed.
func TestSecurityHeaders_ServerRemoved(t *testing.T) {
	app := setupSecurityTestApp()

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	// The Server header should be set to empty string, effectively suppressing it.
	server := resp.Header.Get("Server")
	if server != "" {
		t.Errorf("expected Server header to be empty, got %q", server)
	}
}

// TestSecurityHeaders_DoesNotAffectStatus verifies 200 response is unaffected.
func TestSecurityHeaders_DoesNotAffectStatus(t *testing.T) {
	app := setupSecurityTestApp()

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

// TestSecurityHeaders_WithCORS verifies security headers coexist with CORS.
func TestSecurityHeaders_WithCORS(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORS("*"))

	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	// Security headers should still be present alongside CORS.
	if got := resp.Header.Get("X-Content-Type-Options"); got != "nosniff" {
		t.Errorf("X-Content-Type-Options missing alongside CORS, got %q", got)
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin missing, got %q", got)
	}
}
