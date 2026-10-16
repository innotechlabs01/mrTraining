package commission

import (
	"context"
	"errors"

	"github.com/innotechlabs01/mr-training-api/internal/domain/audit"
)

// ErrNotFound is returned when an agreement or its relationship is not visible
// to the caller. Ownership violations are reported as not-found, never as
// forbidden, so the API does not leak foreign records.
var ErrNotFound = errors.New("commission agreement not found")

// ErrOverlap is returned when a new agreement interval would overlap an existing
// one for the same relationship. Historical intervals are immutable, so the only
// legal move is to open a version strictly after the previous one closes.
var ErrOverlap = errors.New("commission agreement interval overlaps an existing agreement")

// Repository defines persistence for commission agreements.
type Repository interface {
	// CreateAgreementVersion closes the current open agreement (at the new
	// valid_from) and inserts the new version, validating ownership and interval
	// overlap, in a single transaction together with the audit event.
	CreateAgreementVersion(ctx context.Context, in CreateAgreementInput, ev audit.Event) (*Agreement, error)

	// ListByRelationship returns every agreement version for a relationship,
	// newest first.
	ListByRelationship(ctx context.Context, relationshipID string) ([]*Agreement, error)

	// GetOpenAgreement returns the current open agreement (valid_to IS NULL), or
	// ErrNotFound when none exists.
	GetOpenAgreement(ctx context.Context, relationshipID string) (*Agreement, error)
}
