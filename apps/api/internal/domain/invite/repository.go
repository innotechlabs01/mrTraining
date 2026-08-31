package invite

import "context"

// Repository defines data access for coach invitations.
type Repository interface {
	// GetByCode finds an active invite by its coach code.
	GetByCode(ctx context.Context, code string) (*Invite, error)
	// AcceptInvite links the athlete to the coach referenced by the code.
	AcceptInvite(ctx context.Context, code, athleteID string) (*AcceptResult, error)
	// ValidateCode checks whether a code is valid without consuming it.
	ValidateCode(ctx context.Context, code string) (bool, error)
}
