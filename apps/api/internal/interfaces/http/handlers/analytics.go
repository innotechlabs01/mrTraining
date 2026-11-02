// Package handlers provides HTTP handlers for analytics domain.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	analyticsapp "github.com/innotechlabs01/mr-training-api/internal/application/analytics"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

type AnalyticsHandler struct {
	service *analyticsapp.Service
}

func NewAnalyticsHandler(service *analyticsapp.Service) *AnalyticsHandler {
	return &AnalyticsHandler{service: service}
}

func (h *AnalyticsHandler) GetDashboardSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	d, err := h.service.GetDashboardSummary(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, d)
}

func (h *AnalyticsHandler) GetHRZones(c *fiber.Ctx) error {
	athleteID := c.Params("athleteId")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
	}
	zones, err := h.service.GetHRZones(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, zones)
}

func (h *AnalyticsHandler) GetFatigueMap(c *fiber.Ctx) error {
	athleteID := c.Params("athleteId")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
	}
	data, err := h.service.GetFatigueMap(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, data)
}

func (h *AnalyticsHandler) GetOneRM(c *fiber.Ctx) error {
	athleteID := c.Params("athleteId")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
	}
	data, err := h.service.GetOneRM(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, data)
}

func (h *AnalyticsHandler) GetTrainingSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	summary, err := h.service.GetTrainingSummary(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, summary)
}

func (h *AnalyticsHandler) GetEffort(c *fiber.Ctx) error {
	athleteID := c.Params("athleteId")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
	}
	data, err := h.service.GetEffort(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, data)
}
