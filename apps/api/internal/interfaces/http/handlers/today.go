package handlers

import (
	"github.com/gofiber/fiber/v2"

	todayapp "github.com/innotechlabs01/mr-training-api/internal/application/today"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// TodayHandler handles Today dashboard HTTP requests.
type TodayHandler struct {
	service *todayapp.Service
}

// NewTodayHandler creates a new TodayHandler.
func NewTodayHandler(service *todayapp.Service) *TodayHandler {
	return &TodayHandler{service: service}
}

// GetToday handles GET /athletes/today.
func (h *TodayHandler) GetToday(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	data, err := h.service.GetTodayData(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, data)
}
