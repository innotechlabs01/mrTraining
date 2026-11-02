// Package handlers provides HTTP endpoint handlers for the coach domain.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	coachdomain "github.com/innotechlabs01/mr-training-api/internal/domain/coach"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CoachHandler handles HTTP requests for the coach domain.
type CoachHandler struct {
	service *coachapp.Service
}

// NewCoachHandler creates a new CoachHandler with the given application service.
func NewCoachHandler(service *coachapp.Service) *CoachHandler {
	return &CoachHandler{service: service}
}

// GetDashboard handles GET /coaches/dashboard.
func (h *CoachHandler) GetDashboard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	d, err := h.service.GetDashboard(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.DashboardResponse{
		TotalAthletes:    d.TotalAthletes,
		ActiveWorkouts:   d.ActiveWorkouts,
		CompletionRate:   d.CompletionRate,
		UpcomingSessions: d.UpcomingSessions,
		RevenueThisMonth: d.RevenueThisMonth,
	})
}

// GetDailySummary handles GET /coaches/daily-summary.
func (h *CoachHandler) GetDailySummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	d, err := h.service.GetDailySummary(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.DailySummaryResponse{
		Date:           d.Date,
		SessionsToday:  d.SessionsToday,
		AthletesToday:  d.AthletesToday,
		CompletedToday: d.CompletedToday,
		PendingTasks:   d.PendingTasks,
	})
}

// GetTimeBlocks handles GET /coaches/time-blocks.
func (h *CoachHandler) GetTimeBlocks(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	blocks, err := h.service.GetTimeBlocks(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.TimeBlockResponse, len(blocks))
	for i, b := range blocks {
		responses[i] = dto.TimeBlockResponse{
			ID:         b.ID,
			CoachID:    b.CoachID,
			Title:      b.Title,
			BlockType:  b.BlockType,
			StartTime:  b.StartTime,
			EndTime:    b.EndTime,
			Recurrence: b.Recurrence,
			Color:      b.Color,
			CreatedAt:  b.CreatedAt,
			UpdatedAt:  b.UpdatedAt,
		}
	}

	return appresponse.Success(c, responses)
}

// SaveTimeBlocks handles POST /coaches/time-blocks.
func (h *CoachHandler) SaveTimeBlocks(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.SaveTimeBlocksRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	blocks := make([]*coachdomain.TimeBlock, len(req.Blocks))
	for i, b := range req.Blocks {
		blocks[i] = &coachdomain.TimeBlock{
			Title:      b.Title,
			BlockType:  b.BlockType,
			StartTime:  b.StartTime,
			EndTime:    b.EndTime,
			Recurrence: b.Recurrence,
			Color:      b.Color,
		}
	}

	if err := h.service.SaveTimeBlocks(c.Context(), userID, blocks); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "time blocks saved"})
}

// GetAppointments handles GET /coaches/appointments.
func (h *CoachHandler) GetAppointments(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	apts, err := h.service.GetAppointments(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AppointmentResponse, len(apts))
	for i, a := range apts {
		responses[i] = dto.AppointmentResponse{
			ID:          a.ID,
			CoachID:     a.CoachID,
			AthleteID:   a.AthleteID,
			AthleteName: a.AthleteName,
			Title:       a.Title,
			Status:      a.Status,
			StartTime:   a.StartTime,
			EndTime:     a.EndTime,
			Notes:       a.Notes,
			CreatedAt:   a.CreatedAt,
			UpdatedAt:   a.UpdatedAt,
		}
	}

	return appresponse.Success(c, responses)
}

// CreateAppointment handles POST /coaches/appointments.
func (h *CoachHandler) CreateAppointment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAppointmentRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if strings.TrimSpace(req.AthleteID) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete_id is required")
	}
	if strings.TrimSpace(req.Title) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "title is required")
	}
	if req.StartTime == "" || req.EndTime == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "start_time and end_time are required")
	}

	apt := &coachdomain.Appointment{
		CoachID:     userID,
		AthleteID:   req.AthleteID,
		AthleteName: req.AthleteName,
		Title:       req.Title,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		Notes:       req.Notes,
	}

	if err := h.service.CreateAppointment(c.Context(), apt); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AppointmentResponse{
		ID:          apt.ID,
		CoachID:     apt.CoachID,
		AthleteID:   apt.AthleteID,
		AthleteName: apt.AthleteName,
		Title:       apt.Title,
		Status:      apt.Status,
		StartTime:   apt.StartTime,
		EndTime:     apt.EndTime,
		Notes:       apt.Notes,
		CreatedAt:   apt.CreatedAt,
		UpdatedAt:   apt.UpdatedAt,
	})
}

// UpdateAppointment handles PUT /coaches/appointments/:id.
func (h *CoachHandler) UpdateAppointment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "appointment ID is required")
	}

	var req dto.UpdateAppointmentRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if strings.TrimSpace(req.Status) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "status is required")
	}

	apt := &coachdomain.Appointment{
		Status: req.Status,
		Notes:  req.Notes,
	}

	if err := h.service.UpdateAppointment(c.Context(), id, apt); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "appointment updated"})
}

// GetAvailability handles GET /coaches/availability.
func (h *CoachHandler) GetAvailability(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	slots, err := h.service.GetAvailability(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AvailabilitySlotResponse, len(slots))
	for i, s := range slots {
		responses[i] = dto.AvailabilitySlotResponse{
			ID:        s.ID,
			CoachID:   s.CoachID,
			DayOfWeek: s.DayOfWeek,
			StartTime: s.StartTime,
			EndTime:   s.EndTime,
			IsActive:  s.IsActive,
			CreatedAt: s.CreatedAt,
		}
	}

	return appresponse.Success(c, responses)
}

// SaveAvailability handles POST /coaches/availability.
func (h *CoachHandler) SaveAvailability(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.SaveAvailabilityRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	slots := make([]*coachdomain.CoachAvailability, len(req.Slots))
	for i, s := range req.Slots {
		slots[i] = &coachdomain.CoachAvailability{
			DayOfWeek: s.DayOfWeek,
			StartTime: s.StartTime,
			EndTime:   s.EndTime,
			IsActive:  s.IsActive,
		}
	}

	if err := h.service.SaveAvailability(c.Context(), userID, slots); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "availability saved"})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *CoachHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
