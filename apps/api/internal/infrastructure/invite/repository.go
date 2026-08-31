package invite

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/invite"
)

// Repository implements invite.Repository using database/sql with Turso.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new invite repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetByCode finds an active coach by invite code.
func (r *Repository) GetByCode(ctx context.Context, code string) (*invite.Invite, error) {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, coach_code, 'active', created_at
		 FROM coaches WHERE UPPER(coach_code) = ? AND is_active = 1`, normalized)

	inv := &invite.Invite{}
	err := row.Scan(&inv.ID, &inv.CoachID, &inv.Code, &inv.Status, &inv.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("invalid or inactive coach code")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get invite: %w", err)
	}
	return inv, nil
}

// AcceptInvite links an athlete to the coach referenced by the code.
func (r *Repository) AcceptInvite(ctx context.Context, code, athleteID string) (*invite.AcceptResult, error) {
	inv, err := r.GetByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	// Link coach-athlete (idempotent)
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO coach_athlete_links (coach_id, athlete_id, status, is_primary, assigned_at)
		 VALUES (?, ?, 'active', 0, datetime('now'))
		 ON CONFLICT(coach_id, athlete_id) DO UPDATE SET status='active'`,
		inv.CoachID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to link athlete: %w", err)
	}

	// Resolve coach name for the response
	var coachName string
	_ = r.db.QueryRowContext(ctx, `SELECT name FROM coaches WHERE id = ?`, inv.CoachID).Scan(&coachName)

	return &invite.AcceptResult{Success: true, CoachName: coachName}, nil
}

// ValidateCode checks whether a coach code exists and is active.
func (r *Repository) ValidateCode(ctx context.Context, code string) (bool, error) {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	var one int
	err := r.db.QueryRowContext(ctx,
		`SELECT 1 FROM coaches WHERE UPPER(coach_code) = ? AND is_active = 1`, normalized).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to validate code: %w", err)
	}
	return true, nil
}
