package alert

import (
	"context"
	"database/sql"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/alert"
)

// Repository implements the alert.Repository interface using libsql.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new alert repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// ListAlerts returns all alerts for an athlete.
// For now returns empty - can be extended with actual alert logic.
func (r *Repository) ListAlerts(ctx context.Context, athleteID string) ([]*alert.Alert, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, type, severity, title, message, is_read, created_at, dismissed_at
		FROM athlete_alerts
		WHERE athlete_id = $1
		ORDER BY created_at DESC
	`, athleteID)
	if err != nil {
		// Table may not exist yet, return empty list
		return []*alert.Alert{}, nil
	}
	defer rows.Close()

	var alerts []*alert.Alert
	for rows.Next() {
		var a alert.Alert
		var dismissedAt sql.NullString
		if err := rows.Scan(&a.ID, &a.AthleteID, &a.Type, &a.Severity, &a.Title, &a.Message, &a.IsRead, &a.CreatedAt, &dismissedAt); err != nil {
			return nil, fmt.Errorf("failed to scan alert: %w", err)
		}
		if dismissedAt.Valid {
			a.DismissedAt = &dismissedAt.String
		}
		alerts = append(alerts, &a)
	}
	return alerts, nil
}
// SetExecutor sets the executor for queries (e.g. *sql.Tx).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a shallow copy of the repository using the given executor.
func (r *Repository) WithExecutor(exec database.Executor) *Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}
