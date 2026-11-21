package middleware_test

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

func TestMetricsMiddleware_UsesRouteTemplateAndProtectsEndpoint(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.Metrics())
	app.Get("/api/v1/workouts/:id", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	app.Get("/metrics", middleware.MetricsHandler("secret-tok"))

	resp, err := app.Test(httptest.NewRequest("GET", "/api/v1/workouts/abc-123", nil))
	if err != nil {
		t.Fatalf("workout req: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	unauth, err := app.Test(httptest.NewRequest("GET", "/metrics", nil))
	if err != nil {
		t.Fatalf("metrics unauth: %v", err)
	}
	if unauth.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", unauth.StatusCode)
	}

	authReq := httptest.NewRequest("GET", "/metrics", nil)
	authReq.Header.Set("Authorization", "Bearer secret-tok")
	authResp, err := app.Test(authReq)
	if err != nil {
		t.Fatalf("metrics auth: %v", err)
	}
	if authResp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200 with token, got %d", authResp.StatusCode)
	}
	bodyBytes, _ := io.ReadAll(authResp.Body)
	body := string(bodyBytes)
	if !strings.Contains(body, `route="/api/v1/workouts/:id"`) {
		t.Fatalf("expected template route label in metrics output:\n%s", body)
	}
	if strings.Contains(body, "abc-123") {
		t.Fatalf("raw id must never leak into metric labels:\n%s", body)
	}
}
