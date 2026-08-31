package http_test

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http"
)

func TestAPIV1RouterSetsVersionHeader(t *testing.T) {
	app := http.NewAPIV1Router()
	// Register test route under /api/v1 prefix
	app.Group("/api/v1").Get("/test", func(c *fiber.Ctx) error {
		return c.SendStatus(200)
	})

	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	t.Logf("headers: %v", resp.Header)
	if resp.Header.Get("API-Version") != "v1" {
		t.Fatalf("expected API-Version v1, got %s", resp.Header.Get("API-Version"))
	}
}
