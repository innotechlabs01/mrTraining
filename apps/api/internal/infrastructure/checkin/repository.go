package checkin

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/checkin"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements checkin.Repository over SQL (Turso/libsql).
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a check-in repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}
// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool.
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

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// Upsert stores one check-in per athlete and date.
func (r *Repository) Upsert(ctx context.Context, c *domain.Checkin) error {
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO readiness_checkins (id, athlete_id, date, readiness, sleep_hours, soreness, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT(athlete_id, date) DO UPDATE SET
		   readiness = excluded.readiness,
		   sleep_hours = excluded.sleep_hours,
		   soreness = excluded.soreness,
		   notes = excluded.notes`,
		c.ID, c.AthleteID, c.Date, c.Readiness, nullFloat(c.SleepHours), nullInt(c.Soreness), nullStr(c.Notes))
	if err != nil {
		return fmt.Errorf("upsert checkin: %w", err)
	}
	return nil
}

// GetByDate returns the athlete's check-in for a date.
func (r *Repository) GetByDate(ctx context.Context, athleteID, date string) (*domain.Checkin, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, athlete_id, date, readiness, COALESCE(sleep_hours, 0), COALESCE(soreness, 0),
		        COALESCE(notes, ''), created_at
		 FROM readiness_checkins WHERE athlete_id = $1 AND date = $2`, athleteID, date)

	c := &domain.Checkin{}
	err := row.Scan(&c.ID, &c.AthleteID, &c.Date, &c.Readiness, &c.SleepHours, &c.Soreness, &c.Notes, &c.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Checkin", athleteID+"/"+date)
	}
	if err != nil {
		return nil, fmt.Errorf("get checkin: %w", err)
	}
	return c, nil
}

// ListRecent returns the last n check-ins, newest first.
func (r *Repository) ListRecent(ctx context.Context, athleteID string, limit int) ([]*domain.Checkin, error) {
	if limit <= 0 || limit > 90 {
		limit = 14
	}
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, athlete_id, date, readiness, COALESCE(sleep_hours, 0), COALESCE(soreness, 0),
		        COALESCE(notes, ''), created_at
		 FROM readiness_checkins WHERE athlete_id = $1
		 ORDER BY date DESC LIMIT $2`, athleteID, limit)
	if err != nil {
		return nil, fmt.Errorf("list checkins: %w", err)
	}
	defer rows.Close()

	var out []*domain.Checkin
	for rows.Next() {
		c := &domain.Checkin{}
		if err := rows.Scan(&c.ID, &c.AthleteID, &c.Date, &c.Readiness, &c.SleepHours, &c.Soreness, &c.Notes, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan checkin: %w", err)
		}
		out = append(out, c)
	}
	return out, nil
}

func nullFloat(v float64) interface{} {
	if v == 0 {
		return nil
	}
	return v
}

func nullInt(v int) interface{} {
	if v == 0 {
		return nil
	}
	return v
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
