package gamification

import "context"

// Repository defines the persistence interface for gamification domain.
type Repository interface {
	// Streak
	GetStreak(ctx context.Context, athleteID string) (*Streak, error)
	UpsertStreak(ctx context.Context, streak *Streak) error
	LogWorkoutDay(ctx context.Context, day *WorkoutDay) error
	ListWorkoutDays(ctx context.Context, athleteID string, since string) ([]*WorkoutDay, error)

	// Badges
	ListBadges(ctx context.Context, athleteID string) ([]*Badge, error)
	UpsertBadge(ctx context.Context, badge *Badge) error

	// Personal Records
	ListPRs(ctx context.Context, athleteID string) ([]*PersonalRecord, error)
	GetPR(ctx context.Context, athleteID, exerciseID string) (*PersonalRecord, error)
	UpsertPR(ctx context.Context, pr *PersonalRecord) error
}
