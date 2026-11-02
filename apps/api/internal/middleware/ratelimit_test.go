package middleware_test

import (
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupRateLimitTestApp creates a Fiber app with rate limiting for testing.
// Trusted proxy check is enabled so c.IP() reads X-Forwarded-For from
// requests originating from 127.0.0.1 (where app.Test() connects from).
func setupRateLimitTestApp(maxRequests, windowSeconds int) *fiber.App {
	app := fiber.New(fiber.Config{
		EnableTrustedProxyCheck: true,
		// ProxyHeader tells c.IP() which header to read the client IP from.
		// Without this, c.IP() ignores X-Forwarded-For even when trusted.
		ProxyHeader: fiber.HeaderXForwardedFor,
		TrustedProxies: []string{
			"127.0.0.1/32", // app.Test() connects from localhost
			"0.0.0.0/0",
		},
	})
	app.Use(middleware.RateLimit(maxRequests, windowSeconds))

	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	return app
}

// TestRateLimit_WithinLimit verifies requests within the limit pass with 200.
func TestRateLimit_WithinLimit(t *testing.T) {
	app := setupRateLimitTestApp(5, 60)

	for i := 0; i < 5; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request %d: failed to execute: %v", i+1, err)
		}
		if resp.StatusCode != fiber.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i+1, resp.StatusCode)
		}
	}
}

// TestRateLimit_ExceedsLimit verifies that exceeding the limit returns 429.
func TestRateLimit_ExceedsLimit(t *testing.T) {
	app := setupRateLimitTestApp(3, 60)

	// Exhaust the limit.
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request %d: failed to execute: %v", i+1, err)
		}
		if resp.StatusCode != fiber.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i+1, resp.StatusCode)
		}
	}

	// This request should be rate limited.
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("rate limited request: failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", resp.StatusCode)
	}
}

// TestRateLimit_RetryAfterHeader verifies the Retry-After header is set on 429.
func TestRateLimit_RetryAfterHeader(t *testing.T) {
	app := setupRateLimitTestApp(1, 60)

	// First request passes.
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute: %v", err)
	}

	// Second request gets rate limited.
	req = httptest.NewRequest("GET", "/test", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", resp.StatusCode)
	}

	retryAfter := resp.Header.Get("Retry-After")
	if retryAfter == "" {
		t.Fatal("expected Retry-After header to be set")
	}

	val, err := strconv.Atoi(retryAfter)
	if err != nil {
		t.Fatalf("Retry-After should be an integer, got %q: %v", retryAfter, err)
	}
	if val < 1 {
		t.Errorf("Retry-After should be positive, got %d", val)
	}
}

// TestRateLimit_RateLimitHeaders verifies X-RateLimit headers are always present.
func TestRateLimit_RateLimitHeaders(t *testing.T) {
	app := setupRateLimitTestApp(2, 60)

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute: %v", err)
	}

	limit := resp.Header.Get("X-RateLimit-Limit")
	if limit == "" {
		t.Error("expected X-RateLimit-Limit header")
	}
	if limit != "2" {
		t.Errorf("expected X-RateLimit-Limit=2, got %q", limit)
	}

	remaining := resp.Header.Get("X-RateLimit-Remaining")
	if remaining == "" {
		t.Error("expected X-RateLimit-Remaining header")
	}
}

// TestRateLimit_PerIPIsolation verifies that different IPs have independent
// rate limit counters. Uses X-Forwarded-For with trusted proxy config so
// c.IP() returns the forwarded IP instead of 127.0.0.1.
func TestRateLimit_PerIPIsolation(t *testing.T) {
	app := setupRateLimitTestApp(1, 60)

	// IP A uses its one allowed request.
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Forwarded-For", "192.168.100.1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("IP A: expected 200, got %d", resp.StatusCode)
	}

	// IP A is now rate limited.
	req = httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Forwarded-For", "192.168.100.1")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusTooManyRequests {
		t.Fatalf("IP A: expected 429, got %d", resp.StatusCode)
	}

	// IP B still has its own limit — not affected by IP A's usage.
	req = httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Forwarded-For", "192.168.100.2")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("IP B: expected 200, got %d", resp.StatusCode)
	}
}
