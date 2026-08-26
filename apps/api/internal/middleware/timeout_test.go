package middleware_test

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupTimeoutTestApp creates a Fiber app with timeout middleware.
// The handler sleeps for handlerDelay before responding.
func setupTimeoutTestApp(timeoutSeconds int, handlerDelay time.Duration) *fiber.App {
	app := fiber.New()
	app.Use(middleware.Timeout(timeoutSeconds))

	app.Get("/test", func(c *fiber.Ctx) error {
		time.Sleep(handlerDelay)
		return c.SendStatus(fiber.StatusOK)
	})

	return app
}

// TestTimeout_FastRequest verifies requests completing within the timeout pass.
func TestTimeout_FastRequest(t *testing.T) {
	app := setupTimeoutTestApp(2, 50*time.Millisecond)

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

// TestTimeout_SlowRequest verifies requests exceeding the timeout get 508.
func TestTimeout_SlowRequest(t *testing.T) {
	app := setupTimeoutTestApp(1, 3*time.Second)

	req := httptest.NewRequest("GET", "/test", nil)
	// Fiber's app.Test() defaults to 1s timeout — extend it so the
	// middleware's own 1s timeout fires first, not the test client.
	resp, err := app.Test(req, 5000)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusLoopDetected {
		t.Errorf("expected 508, got %d", resp.StatusCode)
	}
}
