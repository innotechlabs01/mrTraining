package handlers

import (
	"github.com/gofiber/fiber/v2"

	alertapp "github.com/innotechlabs01/mr-training-api/internal/application/alert"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AlertHandler handles HTTP requests for the alert domain.
type AlertHandler struct {
	service *alertapp.Service
}

// NewAlertHandler creates a new AlertHandler with the given application service.
func NewAlertHandler(service *alertapp.Service) *AlertHandler {
	return &AlertHandler{service: service}
}

// ListAlerts handles GET /alerts.
func (h *AlertHandler) ListAlerts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	alerts, err := h.service.ListAlerts(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AlertResponse, len(alerts))
	for i, a := range alerts {
		responses[i] = dto.AlertResponse{
			ID:          a.ID,
			Type:        a.Type,
			Severity:    a.Severity,
			Title:       a.Title,
			Message:     a.Message,
			IsRead:      a.IsRead,
			CreatedAt:   a.CreatedAt,
			DismissedAt: a.DismissedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AlertResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *AlertHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}