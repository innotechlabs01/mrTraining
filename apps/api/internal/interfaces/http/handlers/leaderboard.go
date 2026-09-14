package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	leaderboardapp "github.com/innotechlabs01/mr-training-api/internal/application/leaderboard"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// LeaderboardHandler handles HTTP requests for the leaderboard domain.
type LeaderboardHandler struct {
	service *leaderboardapp.Service
}

// NewLeaderboardHandler creates a new LeaderboardHandler.
func NewLeaderboardHandler(service *leaderboardapp.Service) *LeaderboardHandler {
	return &LeaderboardHandler{service: service}
}

// GetGroupLeaderboard handles GET /leaderboard/group/:groupId.
func (h *LeaderboardHandler) GetGroupLeaderboard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	groupID := c.Params("groupId")
	if groupID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "group ID is required")
	}

	weekStart := c.Query("week", "")

	entries, err := h.service.GetGroupLeaderboard(c.Context(), groupID, weekStart)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"entries": entries,
	})
}

// GetWeeklyLeaderboard handles GET /leaderboard/weekly.
func (h *LeaderboardHandler) GetWeeklyLeaderboard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	weekStart := c.Query("week", "")
	limitStr := c.Query("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	entries, err := h.service.GetWeeklyLeaderboard(c.Context(), weekStart, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"entries": entries,
	})
}

// GetUserHistory handles GET /leaderboard/history.
func (h *LeaderboardHandler) GetUserHistory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	limitStr := c.Query("limit", "10")
	limit, _ := strconv.Atoi(limitStr)

	history, err := h.service.GetUserHistory(c.Context(), userID, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"history": history,
	})
}

// handleError maps application errors to HTTP responses.
func (h *LeaderboardHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
