package invite

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements invite.Repository using database/sql with Turso.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new invite repository.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) invite.Repository {
	return &Repository{
		db:  r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// GetByCode finds an active coach by invite code.
func (r *Repository) GetByCode(ctx context.Context, code string) (*invite.Invite, error) {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, user_id, coach_code, 'active', created_at
		 FROM coaches WHERE UPPER(coach_code) = $1 AND is_active = 1`, normalized)

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
	_, err = r.exec.ExecContext(ctx,
		`INSERT INTO coach_athlete_links (coach_id, athlete_id, status, is_primary, assigned_at)
		 VALUES ($1, $2, 'active', 0, NOW())
		 ON CONFLICT(coach_id, athlete_id) DO UPDATE SET status='active'`,
		inv.CoachID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to link athlete: %w", err)
	}

	// Resolve coach name for the response
	var coachName string
	_ = r.exec.QueryRowContext(ctx, `SELECT name FROM coaches WHERE id = $1`, inv.CoachID).Scan(&coachName)

	return &invite.AcceptResult{Success: true, CoachID: inv.CoachID, CoachName: coachName}, nil
}

// GetCoachIDByAthleteID resolves the coach linked to an athlete via coach_athlete_links.
func (r *Repository) GetCoachIDByAthleteID(ctx context.Context, athleteID string) (string, error) {
	var coachID string
	err := r.exec.QueryRowContext(ctx,
		`SELECT coach_id FROM coach_athlete_links WHERE athlete_id = $1 AND status = 'active'`,
		athleteID).Scan(&coachID)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("no active coach link found for athlete")
	}
	if err != nil {
		return "", fmt.Errorf("failed to get coach link: %w", err)
	}
	return coachID, nil
}

// ValidateCode checks whether a coach code exists and is active.
func (r *Repository) ValidateCode(ctx context.Context, code string) (bool, error) {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	var one int
	err := r.exec.QueryRowContext(ctx,
		`SELECT 1 FROM coaches WHERE UPPER(coach_code) = $1 AND is_active = 1`, normalized).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to validate code: %w", err)
	}
	return true, nil
}

// CreatePendingInvite stores a clerk-issued invitation for a coach.
func (r *Repository) CreatePendingInvite(ctx context.Context, inv *invite.PendingInvite) error {
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO pending_invites (id, coach_id, email, clerk_invitation_id, status, expires_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		inv.ID, inv.CoachID, inv.Email, inv.ClerkInvitationID, inv.Status, inv.ExpiresAt)
	if err != nil {
		return fmt.Errorf("create pending invite: %w", err)
	}
	return nil
}
