package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	vaapp "github.com/innotechlabs01/mr-training-api/internal/application/videoanalytics"
	"github.com/innotechlabs01/mr-training-api/internal/domain/videoanalytics"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// VideoAnalyticsHandler handles HTTP requests for the video analytics domain.
type VideoAnalyticsHandler struct {
	service *vaapp.Service
}

// NewVideoAnalyticsHandler creates a new VideoAnalyticsHandler.
func NewVideoAnalyticsHandler(service *vaapp.Service) *VideoAnalyticsHandler {
	return &VideoAnalyticsHandler{service: service}
}

// TrackSession handles POST /video-analytics/track.
func (h *VideoAnalyticsHandler) TrackSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var session videoanalytics.SessionAnalysis
	if err := c.BodyParser(&session); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	session.AthleteID = userID

	if err := h.service.TrackSession(c.Context(), &session); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, session)
}

// GetSummary handles GET /video-analytics/summary.
func (h *VideoAnalyticsHandler) GetSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	summary, err := h.service.GetSummary(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to get summary")
	}

	return appresponse.Success(c, summary)
}

// GetPerExercise handles GET /video-analytics/per-exercise.
func (h *VideoAnalyticsHandler) GetPerExercise(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	analytics, err := h.service.GetPerExercise(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to get per-exercise analytics")
	}

	return appresponse.Success(c, fiber.Map{
		"exercises": analytics,
	})
}

// GetSessions handles GET /video-analytics/sessions.
func (h *VideoAnalyticsHandler) GetSessions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	sessions, err := h.service.GetSessions(c.Context(), userID, limit, offset)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to get sessions")
	}

	return appresponse.Success(c, fiber.Map{
		"sessions": sessions,
	})
}
