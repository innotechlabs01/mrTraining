package challenge

import "time"

// Challenge represents a coach-created video challenge.
type Challenge struct {
	ID              string    `json:"id"`
	CoachID         string    `json:"coach_id"`
	Title           string    `json:"title"`
	Description     string    `json:"description,omitempty"`
	ExerciseType    string    `json:"exercise_type"`
	VideoURL        string    `json:"video_url,omitempty"`
	DurationMinutes int       `json:"duration_minutes"`
	Calories        int       `json:"calories"`
	TargetSets      int       `json:"target_sets,omitempty"`
	TargetReps      int       `json:"target_reps,omitempty"`
	ScoringType     string    `json:"scoring_type"`     // form_score | total_volume | consistency
	DifficultyLevel string    `json:"difficulty_level"` // beginner | intermediate | advanced
	MaxAttempts     int       `json:"max_attempts"`
	Status          string    `json:"status"` // draft | active | completed | expired
	StartDate       string    `json:"start_date,omitempty"`
	EndDate         string    `json:"end_date,omitempty"`
	ExpiresAt       string    `json:"expires_at,omitempty"`
	DaysLeft        int       `json:"days_left"`  // calculated
	IsUrgent        bool      `json:"is_urgent"`  // last day
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ChallengeAttempt represents an athlete's attempt at a challenge.
type ChallengeAttempt struct {
	ID             string     `json:"id"`
	ChallengeID    string     `json:"challenge_id"`
	AthleteID      string     `json:"athlete_id"`
	AttemptNumber  int        `json:"attempt_number"`
	ConsentGivenAt *time.Time `json:"consent_given_at,omitempty"`
	VideoConsent   bool       `json:"video_consent"`
	PhotoConsent   bool       `json:"photo_consent"`
	VideoURL       string     `json:"video_url,omitempty"`
	FormScore      *float64   `json:"form_score,omitempty"`
	DepthScore     *float64   `json:"depth_score,omitempty"`
	AlignmentScore *float64   `json:"alignment_score,omitempty"`
	TempoScore     *float64   `json:"tempo_score,omitempty"`
	SetsCompleted  int        `json:"sets_completed"`
	RepsCompleted  int        `json:"reps_completed"`
	TotalVolume    *float64   `json:"total_volume,omitempty"`
	Notes          string     `json:"notes,omitempty"`
	Status         string     `json:"status"` // in_progress | completed | reviewed
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// LeaderboardEntry represents a ranked athlete in a challenge leaderboard.
type LeaderboardEntry struct {
	Rank        int     `json:"rank"`
	AthleteID   string  `json:"athlete_id"`
	AthleteName string  `json:"athlete_name"`
	AvatarURL   string  `json:"avatar_url,omitempty"`
	Score       float64 `json:"score"`
	Attempts    int     `json:"attempts"`
	BestScore   float64 `json:"best_score"`
	Trend       string  `json:"trend"` // improving | stable | declining
}

// AthleteChallengeAnalytics represents aggregated analytics for an athlete.
type AthleteChallengeAnalytics struct {
	AthleteID           string       `json:"athlete_id"`
	AthleteName         string       `json:"athlete_name"`
	TotalChallenges     int          `json:"total_challenges"`
	CompletedChallenges int          `json:"completed_challenges"`
	AvgFormScore        float64      `json:"avg_form_score"`
	BestFormScore       float64      `json:"best_form_score"`
	ImprovementPct      float64      `json:"improvement_pct"`
	WeakAreas           []string     `json:"weak_areas"`
	RecentTrends        []TrendPoint `json:"recent_trends"`
	ConsistencyRate     float64      `json:"consistency_rate"`
}

// TrendPoint represents a single trend data point.
type TrendPoint struct {
	Date      string  `json:"date"`
	FormScore float64 `json:"form_score"`
	Depth     float64 `json:"depth_score"`
	Alignment float64 `json:"alignment_score"`
}

// Repository defines the storage interface for challenges.
type Repository interface {
	// Challenge CRUD
	GetByID(id string) (*Challenge, error)
	ListByCoach(coachID string) ([]*Challenge, error)
	ListActiveByCoach(coachID string) ([]*Challenge, error)
	ListDraftByCoach(coachID string) ([]*Challenge, error)
	ListActiveForAthlete(athleteID string) ([]*Challenge, error)
	GetActiveForAthlete(athleteID string) (*Challenge, error)
	Create(ch *Challenge) error
	Update(ch *Challenge) error
	Delete(id string) error
	HasAttempts(challengeID string) (bool, error)

	// Attempts
	CreateAttempt(a *ChallengeAttempt) error
	GetAttempt(id string) (*ChallengeAttempt, error)
	ListAttemptsByChallenge(challengeID string) ([]*ChallengeAttempt, error)
	ListAttemptsByAthlete(athleteID string) ([]*ChallengeAttempt, error)
	GetAthleteAttemptCount(challengeID, athleteID string) (int, error)
	UpdateAttempt(a *ChallengeAttempt) error

	// Leaderboard
	GetChallengeLeaderboard(challengeID string) ([]*LeaderboardEntry, error)

	// Analytics
	GetAthleteChallengeAnalytics(athleteID string) (*AthleteChallengeAnalytics, error)
	GetChallengeStats(challengeID string) (map[string]interface{}, error)
	GetAthleteProgress(athleteID, exerciseType string) ([]map[string]interface{}, error)

	// Expiration
	ExpireChallenges() error
}
