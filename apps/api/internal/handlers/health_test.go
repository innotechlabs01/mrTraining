package handlers_test

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupTestApp creates a Fiber app with health check routes for testing.
func setupTestApp() *fiber.App {
	app := fiber.New()
	app.Use(middleware.RequestID())

	app.Get("/health", handlers.HealthCheck("test-api", "test"))
	app.Get("/ready", handlers.ReadinessCheck(nil))

	return app
}

// TestHealthCheck verifies that the health endpoint returns 200 with correct payload.
func TestHealthCheck(t *testing.T) {
	app := setupTestApp()

	req := httptest.NewRequest("GET", "/health", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if result["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%v'", result["status"])
	}
	if result["app"] != "test-api" {
		t.Errorf("expected app 'test-api', got '%v'", result["app"])
	}
	if result["env"] != "test" {
		t.Errorf("expected env 'test', got '%v'", result["env"])
	}
}

// TestReadinessCheck verifies that the ready endpoint returns 200 with status ready.
func TestReadinessCheck(t *testing.T) {
	app := setupTestApp()

	req := httptest.NewRequest("GET", "/ready", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if result["status"] != "ready" {
		t.Errorf("expected status 'ready', got '%v'", result["status"])
	}
}
