package handlers

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	gamificationapp "github.com/innotechlabs01/mr-training-api/internal/application/gamification"
	notificationapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// GamificationHandler handles HTTP requests for the gamification domain.
type GamificationHandler struct {
	service  *gamificationapp.Service
	notifSvc *notificationapp.Service
	db       *sql.DB
}

// NewGamificationHandler creates a new GamificationHandler.
func NewGamificationHandler(service *gamificationapp.Service, notifSvc *notificationapp.Service) *GamificationHandler {
	return &GamificationHandler{service: service, notifSvc: notifSvc}
}

// WithDB attaches a PostgreSQL connection for coach KPIs and transactional RLS isolation.
func (h *GamificationHandler) WithDB(db *sql.DB) *GamificationHandler {
	h.db = db
	return h
}

// GetStreak handles GET /gamification/streak.
func (h *GamificationHandler) GetStreak(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	// Coach can query athlete's streak via ?athlete_id=
	targetUserID := userID
	if middleware.GetUserRole(c) == "coach" {
		if aid := c.Query("athlete_id"); aid != "" {
			targetUserID = aid
		}
	}

	streak, err := h.service.GetStreak(c.Context(), targetUserID)
	if err != nil {
		return h.handleError(c, err)
	}

	today := time.Now().UTC().Format("2006-01-02")
	completedToday := streak.LastWorkoutDate != nil && *streak.LastWorkoutDate == today

	return appresponse.Success(c, dto.StreakResponse{
		CurrentStreak:   streak.CurrentStreak,
		LongestStreak:   streak.LongestStreak,
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

	// Notify the athlete when a new streak badge is unlocked, so the
	// achievement is visible instead of silently recorded.
	newBadges, badgeErr := h.service.CheckBadges(c.Context(), userID, 0, 0, 0)
	if badgeErr == nil {
		for _, b := range newBadges {
			def, ok := gamificationapp.GetBadgeDefinition(b.BadgeID)
			if ok && def.Category == "streak" && h.notifSvc != nil {
				title := "Racha de entrenamiento"
				message := "Desbloqueaste '" + def.Title + "' — " + def.Description
				if _, nerr := h.notifSvc.SendNotification(c.Context(), userID, "badge", title, message, def.Icon); nerr != nil {
					// Best-effort: a failed push must not fail the streak log.
					_ = nerr
				}
			}
		}
	}

	today := time.Now().UTC().Format("2006-01-02")
	completedToday := streak.LastWorkoutDate != nil && *streak.LastWorkoutDate == today

	return appresponse.Success(c, dto.StreakResponse{
		CurrentStreak:   streak.CurrentStreak,
		LongestStreak:   streak.LongestStreak,
		LastWorkoutDate: streak.LastWorkoutDate,
		CompletedToday:  completedToday,
	})
}

// GetTypicalWorkoutTime handles GET /gamification/typical-workout-time.
// Returns the athlete's most common workout hour (HH:MM) so the mobile app can
// schedule a local "time to train" reminder.
func (h *GamificationHandler) GetTypicalWorkoutTime(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	typicalTime, err := h.service.TypicalWorkoutTime(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"typical_workout_time": typicalTime,
	})
}

// GetInactivity handles GET /gamification/inactivity.
// Returns how many days the athlete has been inactive and whether a
// retention nudge should be shown (3 days: streak at risk, 7 days: re-engage).
func (h *GamificationHandler) GetInactivity(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	status, err := h.service.GetInactivityStatus(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Best-effort retention push: only when the status explicitly asks for it.
	if status.ShouldNotify && h.notifSvc != nil {
		if _, nerr := h.notifSvc.SendNotification(c.Context(), userID, "inactivity", "Te extrañamos", status.Message, ""); nerr != nil {
			_ = nerr
		}
	}

	return appresponse.Success(c, status)
}

// ListBadges handles GET /gamification/badges.
func (h *GamificationHandler) ListBadges(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	targetUserID := userID
	if middleware.GetUserRole(c) == "coach" {
		if aid := c.Query("athlete_id"); aid != "" {
			targetUserID = aid
		}
	}

	badges, err := h.service.ListBadges(c.Context(), targetUserID)
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

	targetUserID := userID
	if middleware.GetUserRole(c) == "coach" {
		if aid := c.Query("athlete_id"); aid != "" {
			targetUserID = aid
		}
	}

	prs, err := h.service.ListPRs(c.Context(), targetUserID)
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

// CoachAthleteGamificationKPI represents per-athlete streak, badge, and challenge metrics.
type CoachAthleteGamificationKPI struct {
	AthleteID           string   `json:"athlete_id"`
	AthleteName         string   `json:"athlete_name"`
	CurrentStreak       int      `json:"current_streak"`
	LongestStreak       int      `json:"longest_streak"`
	LastWorkoutDate     string   `json:"last_workout_date,omitempty"`
	BadgesCount         int      `json:"badges_count"`
	BadgeIDs            []string `json:"badge_ids"`
	ChallengesCompleted int      `json:"challenges_completed"`
	RewardEligible      bool     `json:"reward_eligible"`
}

// GetCoachKPIs handles GET /coach/gamification/kpis.
func (h *GamificationHandler) GetCoachKPIs(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	athletes := make([]CoachAthleteGamificationKPI, 0)
	if h.db != nil {
		uow := database.NewUnitOfWork(h.db)
		if err := uow.Begin(c.Context(), coachID, coachID, middleware.GetUserRole(c)); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
		}
		defer uow.Rollback(c.Context())

		rows, err := uow.Tx().QueryContext(c.Context(), `
			SELECT
				cal.athlete_id,
				COALESCE(NULLIF(ca.name, ''), NULLIF(ap.name, ''), NULLIF(u.name, ''), cal.athlete_id) AS athlete_name,
				COALESCE(gs.current_streak, 0) AS current_streak,
				COALESCE(gs.longest_streak, 0) AS longest_streak,
				COALESCE(gs.last_workout_date, '') AS last_workout_date,
				(SELECT COUNT(*) FROM gamification_badges gb WHERE gb.athlete_id = cal.athlete_id) AS badges_count,
				(SELECT COUNT(*) FROM challenge_attempts cat WHERE cat.athlete_id = cal.athlete_id AND cat.status IN ('completed', 'reviewed')) AS challenges_completed
			FROM coach_athlete_links cal
			LEFT JOIN coach_athletes ca ON ca.id = cal.athlete_id AND ca.coach_id = cal.coach_id
			LEFT JOIN athlete_profiles ap ON ap.id = cal.athlete_id
			LEFT JOIN users u ON u.id = cal.athlete_id
			LEFT JOIN gamification_streaks gs ON gs.athlete_id = cal.athlete_id
			WHERE cal.coach_id = $1 AND cal.status = 'active'
			ORDER BY COALESCE(gs.current_streak, 0) DESC, challenges_completed DESC, athlete_name ASC
		`, coachID)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to load gamification KPIs")
		}

		for rows.Next() {
			var item CoachAthleteGamificationKPI
			if scanErr := rows.Scan(
				&item.AthleteID,
				&item.AthleteName,
				&item.CurrentStreak,
				&item.LongestStreak,
				&item.LastWorkoutDate,
				&item.BadgesCount,
				&item.ChallengesCompleted,
			); scanErr != nil {
				rows.Close()
				return appresponse.Error(c, fiber.StatusInternalServerError, "failed to scan gamification KPIs")
			}
			item.BadgeIDs = []string{}
			item.RewardEligible = item.CurrentStreak >= 7 || item.ChallengesCompleted > 0
			athletes = append(athletes, item)
		}
		rows.Close()

		for i := range athletes {
			bRows, bErr := uow.Tx().QueryContext(c.Context(),
				`SELECT badge_id FROM gamification_badges WHERE athlete_id = $1 ORDER BY unlocked_at DESC`,
				athletes[i].AthleteID,
			)
			if bErr == nil {
				for bRows.Next() {
					var bid string
					if err := bRows.Scan(&bid); err == nil {
						athletes[i].BadgeIDs = append(athletes[i].BadgeIDs, bid)
					}
				}
				bRows.Close()
			}
		}

		_ = uow.Commit(c.Context())
	}

	activeStreaks := 0
	longestOverall := 0
	totalStreakSum := 0
	totalBadges := 0
	totalChallengesCompleted := 0
	for _, a := range athletes {
		if a.CurrentStreak > 0 {
			activeStreaks++
		}
		if a.LongestStreak > longestOverall {
			longestOverall = a.LongestStreak
		}
		totalStreakSum += a.CurrentStreak
		totalBadges += a.BadgesCount
		totalChallengesCompleted += a.ChallengesCompleted
	}
	avgStreak := 0.0
	if len(athletes) > 0 {
		avgStreak = float64(totalStreakSum) / float64(len(athletes))
	}

	return appresponse.Success(c, fiber.Map{
		"summary": fiber.Map{
			"total_athletes":             len(athletes),
			"active_streaks":             activeStreaks,
			"avg_streak":                 avgStreak,
			"longest_streak":             longestOverall,
			"total_badges_awarded":       totalBadges,
			"challenges_completed_count": totalChallengesCompleted,
		},
		"athletes":      athletes,
		"badge_catalog": gamificationapp.ListBadgeDefinitions(),
	})
}

// AwardBadge handles POST /coach/gamification/award-badge.
func (h *GamificationHandler) AwardBadge(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		AthleteID     string `json:"athlete_id"`
		BadgeID       string `json:"badge_id"`
		BadgeTitle    string `json:"badge_title"`
		IncentiveNote string `json:"incentive_note"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(req.AthleteID) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete_id is required")
	}
	badgeID := strings.TrimSpace(req.BadgeID)
	if badgeID == "" {
		badgeID = "incentivo-coach"
	}

	svc := h.service
	var uow *database.UnitOfWork
	if h.db != nil {
		uow = database.NewUnitOfWork(h.db)
		if err := uow.Begin(c.Context(), coachID, coachID, middleware.GetUserRole(c)); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
		}
		defer uow.Rollback(c.Context())

		var linked int
		_ = uow.Tx().QueryRowContext(c.Context(),
			`SELECT COUNT(*) FROM coach_athlete_links WHERE coach_id = $1 AND athlete_id = $2 AND status = 'active'`,
			coachID, req.AthleteID,
		).Scan(&linked)
		if linked == 0 {
			return appresponse.Error(c, fiber.StatusForbidden, "athlete is not linked to this coach")
		}

		svc = h.service.WithExecutor(uow.Tx())
	}

	badge, isNew, err := svc.AwardBadge(c.Context(), req.AthleteID, badgeID)
	if err != nil {
		return h.handleError(c, err)
	}
	if uow != nil {
		if err := uow.Commit(c.Context()); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to commit transaction")
		}
	}

	title := strings.TrimSpace(req.BadgeTitle)
	desc := ""
	cat := "reward"
	icon := "AwardIcon"
	if def, ok := gamificationapp.GetBadgeDefinition(badge.BadgeID); ok {
		if title == "" {
			title = def.Title
		}
		desc = def.Description
		cat = def.Category
		icon = def.Icon
	}
	if title == "" {
		title = badge.BadgeID
	}

	if h.notifSvc != nil {
		msg := fmt.Sprintf("Recibiste la insignia \"%s\".", title)
		if note := strings.TrimSpace(req.IncentiveNote); note != "" {
			msg = fmt.Sprintf("Recibiste \"%s\" — Incentivo del coach: %s", title, note)
		}
		_, _ = h.notifSvc.SendNotification(c.Context(), req.AthleteID, "badge", "🏅 ¡Tu coach te otorgó una insignia!", msg, "AwardIcon")
	}

	return appresponse.Success(c, fiber.Map{
		"badge": dto.UserBadgeResponse{
			BadgeID:     badge.BadgeID,
			Title:       title,
			Description: desc,
			Category:    cat,
			Icon:        icon,
			UnlockedAt:  badge.UnlockedAt,
			IsNew:       isNew,
		},
		"is_new":  isNew,
		"message": "Insignia otorgada exitosamente",
	})
}

// handleError maps application errors to HTTP responses.
func (h *GamificationHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
