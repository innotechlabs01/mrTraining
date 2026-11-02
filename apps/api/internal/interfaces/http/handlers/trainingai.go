// Package handlers — training AI insights endpoint.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	trainingaiapp "github.com/innotechlabs01/mr-training-api/internal/application/trainingai"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// TrainingAIHandler exposes the workout AI insights endpoint.
type TrainingAIHandler struct {
	service *trainingaiapp.Service
}

// NewTrainingAIHandler creates a handler with the given application service.
func NewTrainingAIHandler(service *trainingaiapp.Service) *TrainingAIHandler {
	return &TrainingAIHandler{service: service}
}

// GetWorkoutInsights handles GET /workouts/:id/ai-insights.
// Returns per-exercise load suggestions, 1RM, plateau and fatigue for the
// authenticated athlete's own workout.
func (h *TrainingAIHandler) GetWorkoutInsights(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	workoutID := c.Params("id")
	if workoutID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "workout ID is required")
	}

	// Ownership: the workout must belong to the authenticated athlete.
	athleteID, err := h.service.GetWorkoutAthlete(c.Context(), workoutID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "workout not found")
	}
	if athleteID != userID {
		return appresponse.Error(c, fiber.StatusForbidden, "not allowed to view this workout")
	}

	insights, err := h.service.GetWorkoutInsights(c.Context(), workoutID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "could not build insights")
	}

	return appresponse.Success(c, insights)
}
