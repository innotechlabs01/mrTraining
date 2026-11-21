package handlers

import (
	"github.com/gofiber/fiber/v2"

	nutritionapp "github.com/innotechlabs01/mr-training-api/internal/application/nutrition"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// NutritionHandler handles HTTP requests for the nutrition domain.
type NutritionHandler struct {
	service *nutritionapp.Service
}

// NewNutritionHandler creates a new NutritionHandler.
func NewNutritionHandler(service *nutritionapp.Service) *NutritionHandler {
	return &NutritionHandler{service: service}
}

// CreateMealLog handles POST /nutrition/entries.
// Creates a new meal log entry for the authenticated athlete.
func (h *NutritionHandler) CreateMealLog(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateMealLogRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	serviceReq := nutritionapp.CreateMealLogRequest{
		MealType: req.MealType,
		Foods:    req.Foods,
		Macros:   req.Macros,
	}
	log, err := h.service.CreateMealLog(c.Context(), athleteID, serviceReq)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, dto.MealLogResponse{
		ID:        log.ID,
		AthleteID: log.AthleteID,
		MealType:  log.MealType,
		Foods:     log.Foods,
		Macros:    log.Macros,
		LoggedAt:  log.LoggedAt,
	})
}

// ListMealLogs handles GET /nutrition/entries.
// Returns meal logs for the authenticated athlete.
func (h *NutritionHandler) ListMealLogs(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	from := c.Query("from")
	to := c.Query("to")

	logs, err := h.service.ListMealLogs(c.Context(), athleteID, from, to)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	responses := make([]dto.MealLogResponse, len(logs))
	for i, l := range logs {
		responses[i] = dto.MealLogResponse{
			ID:        l.ID,
			AthleteID: l.AthleteID,
			MealType:  l.MealType,
			Foods:     l.Foods,
			Macros:    l.Macros,
			LoggedAt:  l.LoggedAt,
		}
	}

	return appresponse.Success(c, dto.ListMealLogsResponse{
		Data:  responses,
		Total: len(responses),
	})
}

// GetDailyMacros handles GET /nutrition/summary.
// Returns aggregated macros for the authenticated athlete on a given date.
func (h *NutritionHandler) GetDailyMacros(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	date := c.Query("date")
	if date == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "date is required")
	}

	macros, err := h.service.GetDailyMacros(c.Context(), athleteID, date)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, dto.DailyMacrosResponse{
		Date:     macros.Date,
		Protein:  macros.Protein,
		Carbs:    macros.Carbs,
		Fat:      macros.Fat,
		Calories: macros.Calories,
	})
}
