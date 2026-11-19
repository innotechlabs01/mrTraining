// Package handlers provides HTTP endpoint handlers for error tracking.
// Handlers are thin translation layers: parse requests, invoke use cases, serialize responses.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	errorapp "github.com/innotechlabs01/mr-training-api/internal/application/error_tracking"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// ErrorHandler handles HTTP requests for error tracking.
type ErrorHandler struct {
	svc *errorapp.Service
}

// NewErrorHandler creates a new error handler.
func NewErrorHandler(svc *errorapp.Service) *ErrorHandler {
	return &ErrorHandler{svc: svc}
}

// RegisterErrorRoutes mounts error tracking routes on the given API group.
// Routes are super-admin only.
func (h *ErrorHandler) RegisterErrorRoutes(api fiber.Router) {
	errors := api.Group("/errors")
	errors.Post("", h.CreateError)
	errors.Get("", h.ListErrors)
	errors.Get("/:id", h.GetError)
	errors.Put("/:id/resolve", h.ResolveError)
	errors.Get("/stats", h.GetStats)
}

// CreateError handles POST /errors.
// Creates a new error record and posts to Discord.
func (h *ErrorHandler) CreateError(c *fiber.Ctx) error {
	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Source      string `json:"source"`
		Severity    string `json:"severity"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	e, err := h.svc.CreateError(c.Context(), domain.CreateErrorInput{
		Title:       req.Title,
		Description: req.Description,
		Source:      req.Source,
		Severity:    req.Severity,
	})
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, e)
}

// ListErrors handles GET /errors.
// Returns paginated error records with optional filters.
func (h *ErrorHandler) ListErrors(c *fiber.Ctx) error {
	status := c.Query("status", "")
	severity := c.Query("severity", "")
	source := c.Query("source", "")
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	if limit > 100 {
		limit = 100
	}

	records, total, err := h.svc.ListErrors(c.Context(), status, severity, source, limit, offset)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{
		"data":  records,
		"total": total,
		"page":  (offset / limit) + 1,
		"limit": limit,
	})
}

// GetError handles GET /errors/:id.
// Returns a single error record.
func (h *ErrorHandler) GetError(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "error ID is required")
	}

	e, err := h.svc.GetError(c.Context(), id)
	if err != nil {
		if err == domain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "error not found")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, e)
}

// ResolveError handles PUT /errors/:id/resolve.
// Marks an error as resolved or ignored.
func (h *ErrorHandler) ResolveError(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "error ID is required")
	}

	var req struct {
		Status string `json:"status"` // resolved or ignored
		Note   string `json:"note,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	e, err := h.svc.ResolveError(c.Context(), id, "", req.Note, req.Status)
	if err != nil {
		if err == domain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "error not found")
		}
		if appErr, ok := err.(*errors.AppError); ok {
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, e)
}

// GetStats handles GET /errors/stats.
// Returns error counts grouped by status and severity.
func (h *ErrorHandler) GetStats(c *fiber.Ctx) error {
	statusCounts, err := h.svc.CountByStatus(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	severityCounts, err := h.svc.CountBySeverity(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{
		"by_status":  statusCounts,
		"by_severity": severityCounts,
	})
}
