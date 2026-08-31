package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	"github.com/innotechlabs01/mr-training-api/internal/domain/coach"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AthleteSchedulingHandler handles athlete-facing scheduling.
type AthleteSchedulingHandler struct {
	service *coachapp.Service
}

// NewAthleteSchedulingHandler creates handler.
func NewAthleteSchedulingHandler(service *coachapp.Service) *AthleteSchedulingHandler {
	return &AthleteSchedulingHandler{service: service}
}

// GetAvailability handles GET /athlete/availability.
func (h *AthleteSchedulingHandler) GetAvailability(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	// Try to get availability for a generic coach - for now return empty or all.
	// If coachId query param provided, use it.
	coachID := c.Query("coachId", c.Query("coach_id", ""))
	var slots []*coach.CoachAvailability
	var err error
	if coachID != "" {
		slots, err = h.service.GetAvailability(c.Context(), coachID)
	} else {
		// No coachId: return empty to avoid leaking all coaches data
		slots = []*coach.CoachAvailability{}
		err = nil
	}
	if err != nil {
		return h.handleError(c, err)
	}
	if slots == nil {
		slots = []*coach.CoachAvailability{}
	}
	return appresponse.Success(c, fiber.Map{"availability": slots})
}

// CreateAppointment handles POST /athlete/appointments.
func (h *AthleteSchedulingHandler) CreateAppointment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	var req struct {
		Date      string `json:"date"`
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
		Notes     string `json:"notes"`
		CoachID   string `json:"coachId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Date == "" || req.StartTime == "" || req.EndTime == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "date, startTime and endTime are required")
	}
	coachID := req.CoachID
	if coachID == "" {
		coachID = c.Query("coachId", "")
	}
	apt := &coach.Appointment{
		ID:        uuid.New().String(),
		AthleteID: userID,
		CoachID:   coachID,
		Title:     req.Notes,
		StartTime: req.Date + "T" + req.StartTime,
		EndTime:   req.Date + "T" + req.EndTime,
		Status:    "scheduled",
	}
	if err := h.service.CreateAppointment(c.Context(), apt); err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, apt)
}

func (h *AthleteSchedulingHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
