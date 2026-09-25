// Package training provides infrastructure implementations for the training domain.
package training

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
)

// SessionRepository implements training.TrainingSessionRepository backed by the
// durable coach_sessions table (source of truth also used by the web app),
// linked to athletes through the session_athletes join table.
type SessionRepository struct {
	db *sql.DB
}

// NewSessionRepository creates a durable training session repository.
func NewSessionRepository(db *sql.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// Create persists a new training session and links it to the given athlete.
func (r *SessionRepository) Create(ctx context.Context, session *training.TrainingSession) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin session insert: %w", err)
	}
	defer tx.Rollback()

	if session.ID == "" {
		session.ID = uuid.New().String()
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO coach_sessions (id, name, time, end_time, location, status, coach_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		session.ID, session.Title, session.ScheduledAt, session.EndAt, session.Location,
		session.Status, session.CoachID)
	if err != nil {
		return fmt.Errorf("insert coach session: %w", err)
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT OR IGNORE INTO session_athletes (session_id, athlete_id) VALUES (?, ?)`,
		session.ID, session.AthleteID); err != nil {
		return fmt.Errorf("link session athlete: %w", err)
	}

	return tx.Commit()
}

// ListByAthlete retrieves an athlete's sessions scheduled on or after `from`,
// ordered by start time ascending. Athlete linkage comes from session_athletes.
func (r *SessionRepository) ListByAthlete(ctx context.Context, athleteID, from string, limit int) ([]*training.TrainingSession, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if from == "" {
		from = time.Now().UTC().Format(time.RFC3339)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT cs.id, cs.coach_id, cs.name, cs.time, cs.end_time, cs.location, cs.status
		 FROM coach_sessions cs
		 JOIN session_athletes sa ON sa.session_id = cs.id
		 WHERE sa.athlete_id = ? AND cs.time >= ?
		 ORDER BY cs.time ASC
		 LIMIT ?`,
		athleteID, from, limit)
	if err != nil {
		return nil, fmt.Errorf("list athlete sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]*training.TrainingSession, 0)
	for rows.Next() {
		s := &training.TrainingSession{AthleteID: athleteID}
		var endAt sql.NullString
		var location sql.NullString
		if err := rows.Scan(&s.ID, &s.CoachID, &s.Title, &s.ScheduledAt, &endAt, &location, &s.Status); err != nil {
			return nil, fmt.Errorf("scan training session: %w", err)
		}
		if endAt.Valid {
			s.EndAt = endAt.String
		}
		if location.Valid {
			s.Location = location.String
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}