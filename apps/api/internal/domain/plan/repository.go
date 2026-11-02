package plan

import "context"

// Repository defines persistence operations for Plan.
type Repository interface {
	// ListByCoach returns plans for a coach. When activeOnly is true only
	// published plans (is_active=1) are returned. Never returns nil on success.
	ListByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*Plan, error)
	// GetByID returns a single plan. Returns NotFound error if missing.
	GetByID(ctx context.Context, id string) (*Plan, error)
	// Create persists a new plan.
	Create(ctx context.Context, p *Plan) error
	// Update updates an existing plan. Returns NotFound error if missing.
	Update(ctx context.Context, p *Plan) error
	// Delete removes a plan. Returns NotFound error if missing.
	Delete(ctx context.Context, id string) error
}
