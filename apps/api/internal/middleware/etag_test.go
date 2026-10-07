package middleware_test

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// TestCacheConditionalGET verifies cached reads advertise an ETag and answer
// If-None-Match with 304 (no body transfer on repeat loads).
func TestCacheConditionalGET(t *testing.T) {
	middleware.SetCache(cache.NewMemory(16))

	app := fiber.New()
	app.Use(middleware.Cache(time.Minute, "etag"))
	app.Get("/data", func(c *fiber.Ctx) error {
		return c.SendString(`{"ok":true}`)
	})

	// First request: 200 with ETag + revalidation policy.
	resp, err := app.Test(httptest.NewRequest("GET", "/data", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("first GET = %d, want 200", resp.StatusCode)
	}
	etag := resp.Header.Get("ETag")
	if etag == "" {
		t.Fatal("expected ETag header on first GET")
	}
	if cc := resp.Header.Get("Cache-Control"); cc != "private, no-cache" {
		t.Errorf("Cache-Control = %q, want %q", cc, "private, no-cache")
	}

	// Conditional request with the same ETag: 304, empty body.
	req2 := httptest.NewRequest("GET", "/data", nil)
	req2.Header.Set("If-None-Match", etag)
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("conditional request failed: %v", err)
	}
	if resp2.StatusCode != fiber.StatusNotModified {
		t.Errorf("conditional GET = %d, want 304", resp2.StatusCode)
	}
}
