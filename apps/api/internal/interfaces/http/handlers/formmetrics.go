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
	service        *fmapp.Service
	tenantResolver middleware.TenantResolver
}

// NewFormMetricsHandler creates a new FormMetricsHandler.
func NewFormMetricsHandler(service *fmapp.Service) *FormMetricsHandler {
	return &FormMetricsHandler{service: service}
}

// WithTenantResolver attaches a TenantResolver to verify coach-athlete links.
func (h *FormMetricsHandler) WithTenantResolver(r middleware.TenantResolver) *FormMetricsHandler {
	h.tenantResolver = r
	return h
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
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		coachID = userID
	}

	athleteID := c.Params("id")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete ID is required")
	}

	if athleteID != userID {
		if h.tenantResolver == nil {
			return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
		}
		ok, err := h.tenantResolver.AthleteHasActiveCoach(c.Context(), athleteID, coachID)
		if err != nil || !ok {
			return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
		}
	}

	stats, err := h.service.GetByAthlete(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, stats)
}

// GetCoachFormMetrics handles GET /coach/form-metrics.
// Returns aggregated form metrics for all athletes of a coach, grouped by athlete+exercise.
func (h *FormMetricsHandler) GetCoachFormMetrics(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		coachID = userID
	}

	stats, err := h.service.GetByCoach(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	if stats == nil {
		stats = []*formmetrics.CoachAthleteFormStats{}
	}

	return appresponse.Success(c, stats)
}

// GetConsent handles GET /form-metrics/consent.
// Returns the authenticated athlete's AI form-recording consent state from PostgreSQL.
func (h *FormMetricsHandler) GetConsent(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	consent, err := h.service.GetConsent(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{
		"consent": consent,
	})
}

// UpdateConsent handles PUT /form-metrics/consent.
// Persists the authenticated athlete's AI form-recording consent state in PostgreSQL.
func (h *FormMetricsHandler) UpdateConsent(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		Consent string `json:"consent"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Consent != "accepted" && req.Consent != "denied" && req.Consent != "pending" {
		return appresponse.Error(c, fiber.StatusBadRequest, "consent must be accepted, denied, or pending")
	}

	if err := h.service.SetConsent(c.Context(), userID, req.Consent); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{
		"consent": req.Consent,
	})
}
