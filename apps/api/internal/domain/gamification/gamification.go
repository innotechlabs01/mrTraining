package gamification

// Streak represents a user's workout streak data.
type Streak struct {
	ID             string  `json:"id"`
	AthleteID      string  `json:"athlete_id"`
	CurrentStreak  int     `json:"current_streak"`
	LongestStreak  int     `json:"longest_streak"`
	LastWorkoutDate *string `json:"last_workout_date,omitempty"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

// WorkoutDay represents a logged workout day for streak calculation.
type WorkoutDay struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	WorkoutDate string  `json:"workout_date"`
	WorkoutID   *string `json:"workout_id,omitempty"`
	CreatedAt   string  `json:"created_at"`
}

// Badge represents an unlocked achievement.
type Badge struct {
	ID         string `json:"id"`
	AthleteID  string `json:"athlete_id"`
	BadgeID    string `json:"badge_id"`
	UnlockedAt string `json:"unlocked_at"`
}

// PersonalRecord represents a user's best performance for an exercise.
type PersonalRecord struct {
	ID           string   `json:"id"`
	AthleteID    string   `json:"athlete_id"`
	ExerciseID   string   `json:"exercise_id"`
	BestValue    float64  `json:"best_value"`
	Unit         string   `json:"unit"`
	AchievedAt   string   `json:"achieved_at"`
	PreviousBest *float64 `json:"previous_best,omitempty"`
}
