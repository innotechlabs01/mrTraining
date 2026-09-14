package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	gamificationapp "github.com/innotechlabs01/mr-training-api/internal/application/gamification"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// GamificationHandler handles HTTP requests for the gamification domain.
type GamificationHandler struct {
	service *gamificationapp.Service
}

// NewGamificationHandler creates a new GamificationHandler.
func NewGamificationHandler(service *gamificationapp.Service) *GamificationHandler {
	return &GamificationHandler{service: service}
}

// GetStreak handles GET /gamification/streak.
func (h *GamificationHandler) GetStreak(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	streak, err := h.service.GetStreak(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	today := time.Now().UTC().Format("2006-01-02")
	completedToday := streak.LastWorkoutDate != nil && *streak.LastWorkoutDate == today

	return appresponse.Success(c, dto.StreakResponse{
		CurrentStreak:  streak.CurrentStreak,
		LongestStreak:  streak.LongestStreak,
		LastWorkoutDate: streak.LastWorkoutDate,
		CompletedToday:  completedToday,
	})
}

// LogStreak handles POST /gamification/streak/log.
func (h *GamificationHandler) LogStreak(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.LogStreakRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.WorkoutDate == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "workout_date is required")
	}

	streak, err := h.service.LogWorkoutDay(c.Context(), userID, req.WorkoutDate, req.WorkoutID)
	if err != nil {
		return h.handleError(c, err)
	}

	today := time.Now().UTC().Format("2006-01-02")
	completedToday := streak.LastWorkoutDate != nil && *streak.LastWorkoutDate == today

	return appresponse.Success(c, dto.StreakResponse{
		CurrentStreak:  streak.CurrentStreak,
		LongestStreak:  streak.LongestStreak,
		LastWorkoutDate: streak.LastWorkoutDate,
		CompletedToday:  completedToday,
	})
}

// ListBadges handles GET /gamification/badges.
func (h *GamificationHandler) ListBadges(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	badges, err := h.service.ListBadges(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.UserBadgeResponse, len(badges))
	for i, b := range badges {
		def, ok := gamificationapp.GetBadgeDefinition(b.BadgeID)
		title := b.BadgeID
		desc := ""
		cat := ""
		icon := ""
		if ok {
			title = def.Title
			desc = def.Description
			cat = def.Category
			icon = def.Icon
		}
		responses[i] = dto.UserBadgeResponse{
			BadgeID:     b.BadgeID,
			Title:       title,
			Description: desc,
			Category:    cat,
			Icon:        icon,
			UnlockedAt:  b.UnlockedAt,
			IsNew:       false,
		}
	}

	return appresponse.Success(c, responses)
}

// CheckBadges handles POST /gamification/badges/check.
func (h *GamificationHandler) CheckBadges(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	// Get counts from query params (or default to 0).
	totalWorkouts := c.QueryInt("total_workouts", 0)
	totalPRs := c.QueryInt("total_prs", 0)
	feedInteractions := c.QueryInt("feed_interactions", 0)

	newBadges, err := h.service.CheckBadges(c.Context(), userID, totalWorkouts, totalPRs, feedInteractions)
	if err != nil {
		return h.handleError(c, err)
	}

	// Get all badges.
	allBadges, err := h.service.ListBadges(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	newBadgeResponses := make([]dto.UserBadgeResponse, len(newBadges))
	for i, b := range newBadges {
		def, ok := gamificationapp.GetBadgeDefinition(b.BadgeID)
		title := b.BadgeID
		desc := ""
		cat := ""
		icon := ""
		if ok {
			title = def.Title
			desc = def.Description
			cat = def.Category
			icon = def.Icon
		}
		newBadgeResponses[i] = dto.UserBadgeResponse{
			BadgeID:     b.BadgeID,
			Title:       title,
			Description: desc,
			Category:    cat,
			Icon:        icon,
			UnlockedAt:  b.UnlockedAt,
			IsNew:       true,
		}
	}

	allBadgeResponses := make([]dto.UserBadgeResponse, len(allBadges))
	for i, b := range allBadges {
		def, ok := gamificationapp.GetBadgeDefinition(b.BadgeID)
		title := b.BadgeID
		desc := ""
		cat := ""
		icon := ""
		if ok {
			title = def.Title
			desc = def.Description
			cat = def.Category
			icon = def.Icon
		}
		allBadgeResponses[i] = dto.UserBadgeResponse{
			BadgeID:     b.BadgeID,
			Title:       title,
			Description: desc,
			Category:    cat,
			Icon:        icon,
			UnlockedAt:  b.UnlockedAt,
			IsNew:       false,
		}
	}

	return appresponse.Success(c, dto.CheckBadgesResponse{
		NewBadges: newBadgeResponses,
		AllBadges: allBadgeResponses,
	})
}

// ListPRs handles GET /gamification/prs.
func (h *GamificationHandler) ListPRs(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	prs, err := h.service.ListPRs(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.PRResponse, len(prs))
	for i, pr := range prs {
		responses[i] = dto.PRResponse{
			ExerciseID:   pr.ExerciseID,
			ExerciseName: pr.ExerciseID, // Will be resolved by client.
			BestValue:    pr.BestValue,
			Unit:         pr.Unit,
			AchievedAt:   pr.AchievedAt,
			PreviousBest: pr.PreviousBest,
		}
	}

	return appresponse.Success(c, responses)
}

// RecordPR handles POST /gamification/prs.
func (h *GamificationHandler) RecordPR(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.RecordPRRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.ExerciseID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "exercise_id is required")
	}

	pr, isNew, err := h.service.RecordPR(c.Context(), userID, req.ExerciseID, req.ExerciseName, req.Value, req.Unit)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"pr": dto.PRResponse{
			ExerciseID:   pr.ExerciseID,
			ExerciseName: req.ExerciseName,
			BestValue:    pr.BestValue,
			Unit:         pr.Unit,
			AchievedAt:   pr.AchievedAt,
			PreviousBest: pr.PreviousBest,
		},
		"is_new_pr": isNew,
	})
}

// handleError maps application errors to HTTP responses.
func (h *GamificationHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
