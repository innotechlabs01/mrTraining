package middleware_test

import (
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// TestServerTimingSetsHeader verifies the middleware reports handler duration
// in the standard Server-Timing header.
func TestServerTimingSetsHeader(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.ServerTiming())
	app.Get("/test", func(c *fiber.Ctx) error {
		time.Sleep(25 * time.Millisecond)
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req, 2000)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	value := resp.Header.Get("Server-Timing")
	if !strings.HasPrefix(value, "app;dur=") {
		t.Fatalf("Server-Timing = %q, want prefix 'app;dur='", value)
	}

	raw := strings.TrimPrefix(value, "app;dur=")
	ms, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		t.Fatalf("Server-Timing dur is not a number: %q", raw)
	}
	if ms < 20 {
		t.Errorf("Server-Timing dur = %.2f, want >= 20 (handler slept 25ms)", ms)
	}
}
