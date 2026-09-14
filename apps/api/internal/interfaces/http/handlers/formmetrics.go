package handlers

import (
	"github.com/gofiber/fiber/v2"

	fmapp "github.com/innotechlabs01/mr-training-api/internal/application/formmetrics"
	"github.com/innotechlabs01/mr-training-api/internal/domain/formmetrics"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// FormMetricsHandler handles HTTP requests for the form metrics domain.
type FormMetricsHandler struct {
	service *fmapp.Service
}

// NewFormMetricsHandler creates a new FormMetricsHandler.
func NewFormMetricsHandler(service *fmapp.Service) *FormMetricsHandler {
	return &FormMetricsHandler{service: service}
}

// SyncMetrics handles POST /form-metrics/sync.
// Receives a batch of form metrics from an athlete's device.
func (h *FormMetricsHandler) SyncMetrics(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req formmetrics.BatchSyncRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if len(req.Metrics) == 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "metrics array is required")
	}

	// Convert to pointers
	pointers := make([]*formmetrics.FormMetric, len(req.Metrics))
	for i := range req.Metrics {
		pointers[i] = &req.Metrics[i]
	}

	synced, failed, err := h.service.SyncBatch(c.Context(), userID, pointers)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, formmetrics.BatchSyncResponse{
		Synced: synced,
		Failed: failed,
	})
}

// GetByAthlete handles GET /form-metrics.
// Returns form metrics for the authenticated athlete, grouped by exercise.
func (h *FormMetricsHandler) GetByAthlete(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	stats, err := h.service.GetByAthlete(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, stats)
}

// GetAthleteMetrics handles GET /form-metrics/athlete/:id.
// Coach endpoint: returns form metrics for a specific athlete.
func (h *FormMetricsHandler) GetAthleteMetrics(c *fiber.Ctx) error {
	// Coach auth check
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	athleteID := c.Params("id")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete ID is required")
	}

	stats, err := h.service.GetByAthlete(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, stats)
}
