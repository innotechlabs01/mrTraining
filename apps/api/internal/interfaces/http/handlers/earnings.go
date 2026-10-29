// Package handlers provides HTTP endpoint handlers for the earnings domain.
package handlers

import (
	"github.com/gofiber/fiber/v2"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	earningsapp "github.com/innotechlabs01/mr-training-api/internal/application/earnings"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// EarningsHandler handles HTTP requests for coach earnings.
type EarningsHandler struct {
	service *earningsapp.Service
}

// NewEarningsHandler creates a new EarningsHandler.
func NewEarningsHandler(service *earningsapp.Service) *EarningsHandler {
	return &EarningsHandler{service: service}
}

// GetEarningsSummary handles GET /coach/earnings-summary.
// Returns aggregated earnings: own product sales profit + ally commissions.
func (h *EarningsHandler) GetEarningsSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	// Only coaches can view their earnings summary
	if middleware.GetUserRole(c) != "coach" {
		return appresponse.Error(c, fiber.StatusForbidden, "only coaches can view earnings summary")
	}

	summary, err := h.service.GetEarningsSummary(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, summary)
}

// EarningsLive handles GET /coach/earnings-live.
// Exposes live earnings events (new commissions, new sales) as Server-Sent
// Events so a coach can watch earnings in real time without polling.
// Ownership is enforced: only the coach may subscribe to their own stream.
func (h *EarningsHandler) EarningsLive(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	if middleware.GetUserRole(c) != "coach" {
		return appresponse.Error(c, fiber.StatusForbidden, "only coaches can view earnings live")
	}

	// SSE headers.
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache, no-transform")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no") // disable nginx buffering

	ch := runningapp.DefaultHub.Subscribe(userID)
	defer runningapp.DefaultHub.Unsubscribe(userID, ch)

	// Send an initial "connected" event so the client knows the stream is up.
	initial, _ := marshalSSE("earnings.connected", map[string]interface{}{
		"coach_id": userID,
	})
	if _, werr := c.Write([]byte(initial)); werr != nil {
		return werr
	}

	// Stream events until the client disconnects.
	ctx := c.Context()
	for {
		select {
		case <-ctx.Done():
			return nil
		case ev := <-ch:
			data, err := marshalSSE(ev.Type, ev.Payload)
			if err != nil {
				continue
			}
			if _, werr := c.Write([]byte(data)); werr != nil {
				return werr
			}
		}
	}
}
