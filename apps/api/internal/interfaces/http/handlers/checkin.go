package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	checkinapp "github.com/innotechlabs01/mr-training-api/internal/application/checkin"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/checkin"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CheckinHandler exposes the readiness check-in endpoints.
type CheckinHandler struct {
	service *checkinapp.Service
}

// NewCheckinHandler creates the handler with its application service.
func NewCheckinHandler(service *checkinapp.Service) *CheckinHandler {
	return &CheckinHandler{service: service}
}

// SaveCheckin handles POST /athletes/checkin.
func (h *CheckinHandler) SaveCheckin(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		Readiness  int     `json:"readiness"`
		SleepHours float64 `json:"sleep_hours"`
		Soreness   int     `json:"soreness"`
		Notes      string  `json:"notes"`
		Date       string  `json:"date"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	saved, err := h.service.Save(c.Context(), &domain.Checkin{
		AthleteID:  athleteID,
		Date:       req.Date,
		Readiness:  req.Readiness,
		SleepHours: req.SleepHours,
		Soreness:   req.Soreness,
		Notes:      req.Notes,
	})
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return appresponse.Success(c, saved)
}

// GetToday handles GET /athletes/checkin/today.
// Returns 200 with null when the athlete has not checked in yet.
func (h *CheckinHandler) GetToday(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	c2, err := h.service.GetToday(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "could not load check-in")
	}
	return appresponse.Success(c, c2)
}

// ListRecent handles GET /athletes/checkins?limit=14.
func (h *CheckinHandler) ListRecent(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	limit, _ := strconv.Atoi(c.Query("limit", "14"))
	items, err := h.service.ListRecent(c.Context(), athleteID, limit)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "could not load check-ins")
	}
	return appresponse.Success(c, items)
}
