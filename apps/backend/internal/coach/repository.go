package coach

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Save(ctx context.Context, c *Coach) error
	FindByID(ctx context.Context, id, orgID uuid.UUID) (*Coach, error)
	FindByUserID(ctx context.Context, userID, orgID uuid.UUID) (*Coach, error)
	FindAll(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*Coach, error)
}

type CoachBrief struct {
	ID            uuid.UUID
	Name          string
	AvatarURL     string
	Specialization string
	AthleteCount  int
	Rating        float64
	IsVerified    bool
}
