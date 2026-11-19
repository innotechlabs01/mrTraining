// Package error_tracking implements the error tracking repository using PostgreSQL.
// All queries respect RLS: only super admin user IDs can read/write error records.
package error_tracking

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements domain.Repository using PostgreSQL.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new error tracking repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// Create inserts a new error record.
func (r *Repository) Create(ctx context.Context, e *domain.Error) (*domain.Error, error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	e.CreatedAt = now

	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO platform_errors
			(id, title, description, source, severity, status, discord_message_id, discord_channel_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		e.ID, e.Title, e.Description, e.Source, e.Severity, e.Status,
		e.DiscordMessageID, e.DiscordChannelID, e.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert error record: %w", err)
	}
	return e, nil
}

// GetByID returns an error record by ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*domain.Error, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, title, description, source, severity, status,
			discord_message_id, discord_channel_id, created_at,
			resolved_at, resolved_by, resolved_note
		FROM platform_errors WHERE id = $1
	`, id)
	return scanError(row)
}

// List returns error records with optional filters.
func (r *Repository) List(ctx context.Context, status, severity, source string, limit, offset int) ([]*domain.Error, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if severity != "" {
		where += fmt.Sprintf(" AND severity = $%d", argIdx)
		args = append(args, severity)
		argIdx++
	}
	if source != "" {
		where += fmt.Sprintf(" AND source = $%d", argIdx)
		args = append(args, source)
		argIdx++
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM platform_errors " + where
	var total int
	if err := r.exec.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count errors: %w", err)
	}

	// Fetch records
	query := fmt.Sprintf(`
		SELECT id, title, description, source, severity, status,
			discord_message_id, discord_channel_id, created_at,
			resolved_at, resolved_by, resolved_note
		FROM platform_errors %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list errors: %w", err)
	}
	defer rows.Close()

	out := []*domain.Error{}
	for rows.Next() {
		e, err := scanError(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, e)
	}
	return out, total, rows.Err()
}

// Resolve updates the status of an error record.
func (r *Repository) Resolve(ctx context.Context, id, resolvedBy, note, status string) (*domain.Error, error) {
	now := time.Now().UTC()
	result, err := r.exec.ExecContext(ctx, `
		UPDATE platform_errors
		SET status = $1, resolved_at = $2, resolved_by = $3, resolved_note = $4, updated_at = NOW()
		WHERE id = $5
	`, status, now, resolvedBy, note, id)
	if err != nil {
		return nil, fmt.Errorf("resolve error: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return nil, domain.ErrNotFound
	}
	return r.GetByID(ctx, id)
}

// CountByStatus returns the count of errors grouped by status.
func (r *Repository) CountByStatus(ctx context.Context) (map[string]int, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT status, COUNT(*) FROM platform_errors GROUP BY status
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		out[status] = count
	}
	return out, nil
}

// CountBySeverity returns the count of errors grouped by severity.
func (r *Repository) CountBySeverity(ctx context.Context) (map[string]int, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT severity, COUNT(*) FROM platform_errors GROUP BY severity
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var severity string
		var count int
		if err := rows.Scan(&severity, &count); err != nil {
			return nil, err
		}
		out[severity] = count
	}
	return out, nil
}

func scanError(s interface{ Scan(...interface{}) error }) (*domain.Error, error) {
	var e domain.Error
	var resolvedAt, resolvedBy, resolvedNote sql.NullString
	var discordMessageID, discordChannelID sql.NullString

	err := s.Scan(
		&e.ID, &e.Title, &e.Description, &e.Source, &e.Severity, &e.Status,
		&discordMessageID, &discordChannelID, &e.CreatedAt,
		&resolvedAt, &resolvedBy, &resolvedNote,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if discordMessageID.Valid {
		e.DiscordMessageID = discordMessageID.String
	}
	if discordChannelID.Valid {
		e.DiscordChannelID = discordChannelID.String
	}
	if resolvedAt.Valid {
		t, err := time.Parse(time.RFC3339, resolvedAt.String)
		if err == nil {
			e.ResolvedAt = &t
		}
	}
	if resolvedBy.Valid {
		e.ResolvedBy = resolvedBy.String
	}
	if resolvedNote.Valid {
		e.ResolvedNote = resolvedNote.String
	}
	return &e, nil
}
