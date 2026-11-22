package media

import (
	"context"
	"time"
)

// Repository persists and queries MediaObject metadata in PostgreSQL.
type Repository interface {
	Create(ctx context.Context, obj *MediaObject) error
	GetByID(ctx context.Context, id string) (*MediaObject, error)
	GetByKey(ctx context.Context, key string) (*MediaObject, error)
	GetByKeys(ctx context.Context, keys []string) ([]*MediaObject, error)
	MarkReady(ctx context.Context, id string, sizeBytes int64, contentType string, confirmedAt time.Time) error
	MarkDeleted(ctx context.Context, id string, deletedAt time.Time) error
	// HasActiveCoachAthleteLink checks whether coachID and athleteUserID share an active relationship.
	HasActiveCoachAthleteLink(ctx context.Context, coachID, athleteUserID string) (bool, error)
	// IsSupportTicketParticipant checks whether userID is the ticket owner or assigned coach/admin.
	IsSupportTicketParticipant(ctx context.Context, userID, objectRef string) (bool, error)
}
