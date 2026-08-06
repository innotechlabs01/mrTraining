package athlete

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Save(ctx context.Context, a *Athlete) error
	FindByID(ctx context.Context, id, orgID uuid.UUID) (*Athlete, error)
	FindByUserID(ctx context.Context, userID, orgID uuid.UUID) (*Athlete, error)
	FindByCoach(ctx context.Context, coachID, orgID uuid.UUID) ([]*Athlete, error)
	WithReadiness(ctx context.Context, athleteIDs []uuid.UUID) (map[uuid.UUID]*ReadinessScore, error)
}

type ReadinessScore struct {
	AthleteID    uuid.UUID
	SleepHours   float64
	HRV          int
	RecoveryPct  int
	Score        int
	Flag         *AthleteFlag
}

type AthleteFlag struct {
	Type     string
	Severity string
	Message  string
}

type AthleteBrief struct {
	ID           uuid.UUID
	Name         string
	AvatarURL    string
	Sport        string
	Readiness    ReadinessScore
	TodaySessionIDs []string
}
