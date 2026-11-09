// Package handlers — Garmin Health API webhook.
package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// GarminWebhookHandler receives Garmin push notifications and triggers an
// immediate activity sync for the affected users.
//
// Garmin sends a signature header configured at partner registration; when
// GARMIN_WEBHOOK_SECRET is set we require it to match (fail closed).
type GarminWebhookHandler struct {
	service *runningapp.Service
	secret  string
}

// NewGarminWebhookHandler creates the webhook handler. Empty secret disables
// the endpoint (returns 503) to avoid an unauthenticated sync trigger.
func NewGarminWebhookHandler(service *runningapp.Service, secret string) *GarminWebhookHandler {
	return &GarminWebhookHandler{service: service, secret: secret}
}

// Handle processes POST /webhooks/garmin.
// Payload (Garmin push): { "userIds": ["..."], "activityIds": [...] }.
func (h *GarminWebhookHandler) Handle(c *fiber.Ctx) error {
	if h.secret == "" {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "garmin webhook not configured")
	}
	if c.Get("X-Garmin-Signature") != h.secret {
		return appresponse.Error(c, fiber.StatusUnauthorized, "invalid signature")
	}

	var payload struct {
		UserIDs []string `json:"userIds"`
		UserID  string   `json:"userId"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid payload")
	}

	ids := payload.UserIDs
	if payload.UserID != "" {
		ids = append(ids, payload.UserID)
	}
	if len(ids) == 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "no userIds in payload")
	}
	if len(ids) > 100 {
		return appresponse.Error(c, fiber.StatusBadRequest, "too many userIds (max 100)")
	}

	to := time.Now().UTC()
	from := to.AddDate(0, 0, -30)
	synced := 0
	failures := 0
	for _, userID := range ids {
		n, err := h.service.SyncFromProvider(c.Context(), "garmin", userID, from, to)
		if err != nil {
			failures++
			continue
		}
		synced += n
	}

	return appresponse.Success(c, fiber.Map{
		"users":           len(ids),
		"sessions_synced": synced,
		"failures":        failures,
	})
}
