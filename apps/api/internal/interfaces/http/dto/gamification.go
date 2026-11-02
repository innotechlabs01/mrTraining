package dto

// --- Streak ---

// StreakResponse is the response for GET /gamification/streak.
type StreakResponse struct {
	CurrentStreak  int     `json:"current_streak"`
	LongestStreak  int     `json:"longest_streak"`
	LastWorkoutDate *string `json:"last_workout_date,omitempty"`
	CompletedToday bool    `json:"completed_today"`
}

// LogStreakRequest is the payload for POST /gamification/streak/log.
type LogStreakRequest struct {
	WorkoutDate string  `json:"workout_date"` // YYYY-MM-DD
	WorkoutID   *string `json:"workout_id,omitempty"`
}

// --- Badges ---

// BadgeDefinition represents a badge type in API responses.
type BadgeDefinition struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Icon        string `json:"icon"`
	Threshold   int    `json:"threshold"`
}

// UserBadgeResponse represents a user's badge in API responses.
type UserBadgeResponse struct {
	BadgeID     string `json:"badge_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Icon        string `json:"icon"`
	UnlockedAt  string `json:"unlocked_at"`
	IsNew       bool   `json:"is_new"`
}

// CheckBadgesResponse is the response for POST /gamification/badges/check.
type CheckBadgesResponse struct {
	NewBadges []UserBadgeResponse `json:"new_badges"`
	AllBadges []UserBadgeResponse `json:"all_badges"`
}

// --- Inactivity / retention ---

// InactivityStatus reports how long an athlete has been inactive and whether
// a retention nudge should be shown.
type InactivityStatus struct {
	AthleteID    string `json:"athlete_id"`
	DaysInactive int    `json:"days_inactive"`
	// StreakAtRisk is true when the athlete has an active streak that is in
	// danger of breaking (1-2 days since last workout).
	StreakAtRisk bool `json:"streak_at_risk"`
	// ShouldNotify is true when a retention push should be sent
	// (3 days: streak at risk, 7 days: re-engage).
	ShouldNotify bool   `json:"should_notify"`
	Message      string `json:"message"`
}

// --- Personal Records ---

// PRResponse represents a personal record in API responses.
type PRResponse struct {
	ExerciseID   string   `json:"exercise_id"`
	ExerciseName string   `json:"exercise_name"`
	BestValue    float64  `json:"best_value"`
	Unit         string   `json:"unit"`
	AchievedAt   string   `json:"achieved_at"`
	PreviousBest *float64 `json:"previous_best,omitempty"`
	Improvement  *float64 `json:"improvement,omitempty"`
}

// RecordPRRequest is the payload for POST /gamification/prs.
type RecordPRRequest struct {
	ExerciseID   string  `json:"exercise_id"`
	ExerciseName string  `json:"exercise_name"`
	Value        float64 `json:"value"`
	Unit         string  `json:"unit"`
}

// PRHistoryResponse is the response for GET /gamification/prs/history.
type PRHistoryResponse struct {
	ExerciseID   string       `json:"exercise_id"`
	ExerciseName string       `json:"exercise_name"`
	CurrentPR    *PRResponse  `json:"current_pr,omitempty"`
	History      []PRResponse `json:"history"`
}
