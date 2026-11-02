package middleware_test

import (
	"bytes"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupBodyLimitTestApp creates a Fiber app with body limit middleware.
func setupBodyLimitTestApp(maxMB int) *fiber.App {
	app := fiber.New()
	app.Use(middleware.BodyLimit(maxMB))

	app.Post("/test", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	return app
}

// TestBodyLimit_SmallBodyAccepted verifies a small body passes.
func TestBodyLimit_SmallBodyAccepted(t *testing.T) {
	app := setupBodyLimitTestApp(5)

	body := strings.NewReader(`{"name":"test"}`)
	req := httptest.NewRequest("POST", "/test", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Content-Length", "15")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

// TestBodyLimit_OversizedBodyRejected verifies a body exceeding the limit is rejected.
func TestBodyLimit_OversizedBodyRejected(t *testing.T) {
	app := setupBodyLimitTestApp(1) // 1MB limit

	// Create a body larger than 1MB.
	oversized := bytes.Repeat([]byte("x"), 2*1024*1024) // 2MB
	req := httptest.NewRequest("POST", "/test", bytes.NewReader(oversized))
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Length", "2097152") // 2MB

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusRequestEntityTooLarge {
		t.Errorf("expected 413, got %d", resp.StatusCode)
	}
}

// TestBodyLimit_ExactLimitAccepted verifies a body exactly at the limit passes.
func TestBodyLimit_ExactLimitAccepted(t *testing.T) {
	app := setupBodyLimitTestApp(1) // 1MB limit

	// Create a body exactly at 1MB.
	body := bytes.Repeat([]byte("x"), 1*1024*1024) // 1MB
	req := httptest.NewRequest("POST", "/test", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Length", "1048576") // 1MB

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}
