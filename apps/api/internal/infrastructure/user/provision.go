package user

import (
	"context"
	"database/sql"
	"fmt"
)

// EnsureUser idempotently creates the base users row if it does not exist.
// Used for auto-provisioning when the Clerk webhook missed a user.
func (r *Repository) EnsureUser(ctx context.Context, id, email, name, role string) error {
	if id == "" || role == "" {
		return fmt.Errorf("id and role are required")
	}
	if email == "" {
		email = id
	}
	if name == "" {
		name = email
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT OR IGNORE INTO users (id, email, name, avatar_url, role, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, '', ?, 1, datetime('now'), datetime('now'))`,
		id, email, name, role)
	if err != nil {
		return fmt.Errorf("ensure user: %w", err)
	}
	return nil
}

// EnsureCoach idempotently creates the coaches profile row for a coach user.
// The generated coach_code is used by the athlete invite flow.
func (r *Repository) EnsureCoach(ctx context.Context, userID, email, name string) error {
	if userID == "" {
		return fmt.Errorf("user id is required")
	}
	if email == "" {
		email = userID
	}
	if name == "" {
		name = email
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT OR IGNORE INTO coaches (id, email, name, coach_code, created_at, updated_at)
		 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		userID, email, name, GenerateCoachCode())
	if err != nil {
		return fmt.Errorf("ensure coach: %w", err)
	}
	return nil
}

// EnsureAthleteProfile idempotently creates the athlete_profiles row for an athlete user.
func (r *Repository) EnsureAthleteProfile(ctx context.Context, userID, email, name string) error {
	if userID == "" {
		return fmt.Errorf("user id is required")
	}
	if email == "" {
		email = userID
	}
	if name == "" {
		name = email
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT OR IGNORE INTO athlete_profiles (id, email, name, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`,
		userID, email, name)
	if err != nil {
		return fmt.Errorf("ensure athlete profile: %w", err)
	}
	return nil
}

// CoachExists reports whether the coach profile row exists for the user.
func (r *Repository) CoachExists(ctx context.Context, userID string) (bool, error) {
	return r.rowExists(ctx, "SELECT 1 FROM coaches WHERE id = ?", userID)
}

// AthleteProfileExists reports whether the athlete profile row exists for the user.
func (r *Repository) AthleteProfileExists(ctx context.Context, userID string) (bool, error) {
	return r.rowExists(ctx, "SELECT 1 FROM athlete_profiles WHERE id = ?", userID)
}

func (r *Repository) rowExists(ctx context.Context, query, id string) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, query, id).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("row exists check: %w", err)
	}
	return true, nil
}
