package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

func TestGarminWebhook_SecretNotConfigured(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewBufferString(`{"userIds":["u1"]}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusServiceUnavailable, resp.StatusCode)
}

func TestGarminWebhook_MissingSignature(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "secret-token-123")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewBufferString(`{"userIds":["u1"]}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestGarminWebhook_InvalidSignature(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "secret-token-123")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewBufferString(`{"userIds":["u1"]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "wrong-token-abc")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestGarminWebhook_InvalidPayload(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "secret-token-123")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewBufferString(`invalid-json`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "secret-token-123")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestGarminWebhook_QueuesAsync202WhenPublisherConfigured(t *testing.T) {
	app := fiber.New()
	bus := eventbus.NewInMemoryBus()
	handler := NewGarminWebhookHandler(nil, "secret-token-123").WithPublisher(bus)
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewBufferString(`{"userIds":["u1","u2"]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "secret-token-123")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusAccepted, resp.StatusCode)
	published := bus.PublishedEvents()
	require.Len(t, published, 2)
	assert.Equal(t, eventbus.SubjectGarminSyncRequested, published[0].EventType)
	assert.Equal(t, "u1", published[0].AggregateID)
	assert.Equal(t, "u2", published[1].AggregateID)
}

func TestGarminWebhook_EmptyUserIDs(t *testing.T) {
	app := fiber.New()
	handler := NewGarminWebhookHandler(nil, "secret-token-123")
	app.Post("/webhooks/garmin", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/garmin", bytes.NewBufferString(`{"userIds":[]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Garmin-Signature", "secret-token-123")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}
