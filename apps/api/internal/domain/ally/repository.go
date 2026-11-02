package ally

import (
	"context"
	"errors"

	"github.com/innotechlabs01/mr-training-api/internal/domain/audit"
)

// ErrNotFound is returned when the requested record does not exist or is not
// visible to the caller. Implementations must NOT distinguish the two cases:
// an ownership violation is reported as not-found so the API never leaks the
// existence of another coach's or ally's records.
var ErrNotFound = errors.New("ally record not found")

// Repository defines persistence for the ally domain.
type Repository interface {
	// CreateAllyWithRelationship creates the ally, its owner membership (when
	// present) and the coach-ally relationship, and writes the audit event all
	// inside one transaction.
	CreateAllyWithRelationship(ctx context.Context, in CreateInput, ev audit.Event) (*Ally, *Relationship, error)

	// ListByCoach returns every ally related to the given coach.
	ListByCoach(ctx context.Context, coachID string) ([]*Summary, error)

	// GetByIDForCoach returns the ally detail for a relationship, but only when
	// the relationship belongs to coachID.
	GetByIDForCoach(ctx context.Context, relationshipID, coachID string) (*Detail, error)

	// ListByAllyUser returns every ally the given user owns or belongs to.
	ListByAllyUser(ctx context.Context, userID string) ([]*Summary, error)

	// FindActiveRelationship returns the relationship_id when an active
	// coach-ally relationship exists between coachID and allyID.
	FindActiveRelationship(ctx context.Context, coachID, allyID string) (string, error)
}
