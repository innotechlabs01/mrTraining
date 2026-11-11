package user

import (
	"context"
	"database/sql"
	"fmt"
)

// EnsureUser idempotently creates the base users row if it does not exist.
// Used for auto-provisioning when the Clerk webhook missed a user.
// Bypasses RLS by setting app.current_user_id for the transaction.
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
	// Use a transaction to set RLS context and bypass policy
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("ensure user: begin tx: %w", err)
	}
	defer tx.Rollback()

	// Set the RLS context to the user being provisioned
	if _, err = tx.ExecContext(ctx, `SELECT set_config('app.current_user_id', $1, true)`, id); err != nil {
		return fmt.Errorf("ensure user: set rls context: %w", err)
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO users (id, email, name, avatar_url, role, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, '', $4, true, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		id, email, name, role)
	if err != nil {
		return fmt.Errorf("ensure user: %w", err)
	}

	return tx.Commit()
}

// EnsureCoach idempotently creates the coaches profile row for a coach user.
// The generated coach_code is used by the athlete invite flow.
// Bypasses RLS by setting app.current_user_id for the transaction.
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
	// Use a transaction to set RLS context and bypass policy
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("ensure coach: begin tx: %w", err)
	}
	defer tx.Rollback()

	// Set the RLS context to the user being provisioned
	if _, err = tx.ExecContext(ctx, `SELECT set_config('app.current_user_id', $1, true)`, userID); err != nil {
		return fmt.Errorf("ensure coach: set rls context: %w", err)
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO coaches (id, email, name, coach_code, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		userID, email, name, GenerateCoachCode())
	if err != nil {
		return fmt.Errorf("ensure coach: %w", err)
	}

	return tx.Commit()
}

// EnsureAthleteProfile idempotently creates the athlete_profiles row for an athlete user.
// Bypasses RLS by setting app.current_user_id for the transaction.
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
	// Use a transaction to set RLS context and bypass policy
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("ensure athlete profile: begin tx: %w", err)
	}
	defer tx.Rollback()

	// Set the RLS context to the user being provisioned
	if _, err = tx.ExecContext(ctx, `SELECT set_config('app.current_user_id', $1, true)`, userID); err != nil {
		return fmt.Errorf("ensure athlete profile: set rls context: %w", err)
	}

	// athlete_profiles.is_active is an INTEGER column (unlike users.is_active,
	// which is a BOOLEAN), so the literal must be 1 — passing `true` fails
	// with "column is of type integer but expression is of type boolean" and
	// leaves the athlete without a profile.
	_, err = tx.ExecContext(ctx,
		`INSERT INTO athlete_profiles (id, email, name, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, 1, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		userID, email, name)
	if err != nil {
		return fmt.Errorf("ensure athlete profile: %w", err)
	}

	return tx.Commit()
}

// SoftDeleteUser marks the user and their coach profile as inactive.
func (r *Repository) SoftDeleteUser(ctx context.Context, userID string) error {
	if _, err := r.db.ExecContext(ctx,
		`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
		userID); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}
	if _, err := r.db.ExecContext(ctx,
		`UPDATE coaches SET is_active = false, updated_at = NOW() WHERE id = $1`,
		userID); err != nil {
		return fmt.Errorf("soft delete coach: %w", err)
	}
	return nil
}

// CoachExists reports whether the coach profile row exists for the user.
func (r *Repository) CoachExists(ctx context.Context, userID string) (bool, error) {
	return r.rowExists(ctx, "SELECT 1 FROM coaches WHERE id = $1", userID)
}

// AthleteProfileExists reports whether the athlete profile row exists for the user.
func (r *Repository) AthleteProfileExists(ctx context.Context, userID string) (bool, error) {
	return r.rowExists(ctx, "SELECT 1 FROM athlete_profiles WHERE id = $1", userID)
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
