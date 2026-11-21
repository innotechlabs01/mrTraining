// Package handlers — Garmin Health API webhook.
package handlers

import (
	"crypto/subtle"
	"time"

	"github.com/gofiber/fiber/v2"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// GarminWebhookHandler receives Garmin push notifications and triggers activity
// syncs asynchronously (202 Accepted) when an event publisher/outbox is wired,
// or synchronously as a fallback.
type GarminWebhookHandler struct {
	service   *runningapp.Service
	secret    string
	publisher eventbus.Publisher
	outbox    eventbus.OutboxWriter
}

// NewGarminWebhookHandler creates the webhook handler. Empty secret disables
// the endpoint (returns 503) to avoid an unauthenticated sync trigger.
func NewGarminWebhookHandler(service *runningapp.Service, secret string) *GarminWebhookHandler {
	return &GarminWebhookHandler{service: service, secret: secret}
}

// WithPublisher configures direct async publishing (e.g. JetStream or InMemoryBus).
func (h *GarminWebhookHandler) WithPublisher(pub eventbus.Publisher) *GarminWebhookHandler {
	h.publisher = pub
	return h
}

// WithOutbox configures transactional outbox queueing for Garmin sync requests.
func (h *GarminWebhookHandler) WithOutbox(outbox eventbus.OutboxWriter) *GarminWebhookHandler {
	h.outbox = outbox
	return h
}

// Handle processes POST /webhooks/garmin.
func (h *GarminWebhookHandler) Handle(c *fiber.Ctx) error {
	if h.secret == "" {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "garmin webhook is not configured")
	}

	sig := c.Get("X-Garmin-Signature")
	if sig == "" || len(sig) != len(h.secret) || subtle.ConstantTimeCompare([]byte(sig), []byte(h.secret)) != 1 {
		metrics.WebhooksReceivedTotal.Inc("garmin", "invalid_signature")
		return appresponse.Error(c, fiber.StatusUnauthorized, "invalid garmin signature")
	}

	var payload struct {
		UserIDs []string `json:"userIds"`
		UserID  string   `json:"userId"`
	}
	if err := c.BodyParser(&payload); err != nil {
		metrics.WebhooksReceivedTotal.Inc("garmin", "bad_payload")
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

	ctx := middleware.RequestContext(c)
	to := time.Now().UTC()
	from := to.AddDate(0, 0, -30)

	// Fast-path: queue asynchronously via event bus / outbox and return 202 Accepted.
	if h.publisher != nil || h.outbox != nil {
		queued := 0
		for _, userID := range ids {
			ev := eventbus.NewEvent(ctx, eventbus.SubjectGarminSyncRequested, "wearable", userID, map[string]interface{}{
				"provider": "garmin",
				"user_id":  userID,
				"from":     from.Format(time.RFC3339),
				"to":       to.Format(time.RFC3339),
			}).WithTenant("", userID, "")
			if h.publisher != nil {
				if err := h.publisher.Publish(ctx, ev); err == nil {
					queued++
					continue
				}
			}
			if h.outbox != nil {
				if err := h.outbox.Insert(ctx, nil, ev); err == nil {
					queued++
				}
			}
		}
		metrics.WebhooksReceivedTotal.Inc("garmin", "accepted")
		return appresponse.JSON(c, fiber.StatusAccepted, fiber.Map{
			"status": "accepted",
			"queued": queued,
			"users":  len(ids),
		})
	}

	// Synchronous fallback when neither publisher nor outbox is attached.
	synced := 0
	failures := 0
	for _, userID := range ids {
		n, err := h.service.SyncFromProvider(ctx, "garmin", userID, from, to)
		if err != nil {
			failures++
			continue
		}
		synced += n
	}

	metrics.WebhooksReceivedTotal.Inc("garmin", "ok")
	return appresponse.Success(c, fiber.Map{
		"users":           len(ids),
		"sessions_synced": synced,
		"failures":        failures,
	})
}
