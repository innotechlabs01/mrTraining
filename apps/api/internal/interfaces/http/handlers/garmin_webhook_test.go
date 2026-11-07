package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestGarminWebhook_UnconfiguredSecret(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewReader([]byte(`{"userIds":["u1"]}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "any-sig")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", resp.StatusCode)
	}
}

func TestGarminWebhook_MissingSignature(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "super-secret-key")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewReader([]byte(`{"userIds":["u1"]}`)))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", resp.StatusCode)
	}
}

func TestGarminWebhook_InvalidSignature(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "super-secret-key")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewReader([]byte(`{"userIds":["u1"]}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "wrong-secret-key")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", resp.StatusCode)
	}
}

func TestGarminWebhook_InvalidPayload(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "super-secret-key")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewReader([]byte(`invalid-json`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "super-secret-key")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestGarminWebhook_NoUserIDs(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "super-secret-key")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewReader([]byte(`{"userIds":[]}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "super-secret-key")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", resp.StatusCode)
	}
}
