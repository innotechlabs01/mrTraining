package handlers

import (
	"github.com/gofiber/fiber/v2"

	videoviewapp "github.com/innotechlabs01/mr-training-api/internal/application/videoview"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// VideoViewHandler handles HTTP requests for the video view domain.
type VideoViewHandler struct {
	service *videoviewapp.Service
}

// NewVideoViewHandler creates a new VideoViewHandler with the given application service.
func NewVideoViewHandler(service *videoviewapp.Service) *VideoViewHandler {
	return &VideoViewHandler{service: service}
}

// RecordVideoView handles POST /video-views.
func (h *VideoViewHandler) RecordVideoView(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.RecordVideoViewRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.ExerciseID == "" || req.Action == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "exercise_id and action are required")
	}

	vv, err := h.service.RecordVideoView(c.Context(), userID, req.ExerciseID, req.Action, req.ProgressPct, req.WatchDuration)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.VideoViewResponse{
		ID:            vv.ID,
		ExerciseID:    vv.ExerciseID,
		Action:        vv.Action,
		ProgressPct:   vv.ProgressPct,
		WatchDuration: vv.WatchDuration,
		CreatedAt:     vv.CreatedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *VideoViewHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}