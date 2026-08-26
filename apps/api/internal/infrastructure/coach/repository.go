//go:build ignore

package coach

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

// Repository implements coach.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new coach repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetDashboard retrieves aggregated dashboard metrics for a coach.
func (r *Repository) GetDashboard(ctx context.Context, coachID string) (*Dashboard, error) {
	d := &Dashboard{}

	// Count total athletes
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT athlete_id) FROM coach_athletes WHERE coach_id = ?`, coachID).Scan(&d.TotalAthletes)
	if err != nil {
		return nil, fmt.Errorf("failed to count athletes: %w", err)
	}

	// Count active workouts
	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM assigned_workouts WHERE coach_id = ? AND status = 'active'`, coachID).Scan(&d.ActiveWorkouts)
	if err != nil {
		return nil, fmt.Errorf("failed to count active workouts: %w", err)
	}

	// Calculate completion rate from workout sessions
	err = r.db.QueryRowContext(ctx,
		`SELECT COALESCE(
			(SELECT CAST(COUNT(CASE WHEN completed = 1 THEN 1 END) AS REAL) * 100.0 / NULLIF(COUNT(*), 0)
			FROM workout_session_logs wsl
			JOIN assigned_workouts aw ON wsl.workout_id = aw.id
			WHERE aw.coach_id = ?), 0)`, coachID).Scan(&d.CompletionRate)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate completion rate: %w", err)
	}

	// Count upcoming sessions (appointments in the future)
	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coach_appointments
		 WHERE coach_id = ? AND status = 'scheduled' AND start_time > datetime('now')`, coachID).Scan(&d.UpcomingSessions)
	if err != nil {
		// Table might not exist yet — return 0
		d.UpcomingSessions = 0
	}

	return d, nil
}

// GetDailySummary retrieves today's summary for a coach.
func (r *Repository) GetDailySummary(ctx context.Context, coachID string) (*DailySummary, error) {
	d := &DailySummary{Date: "date('now')"}

	// Sessions today
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coach_appointments
		 WHERE coach_id = ? AND date(start_time) = date('now')`, coachID).Scan(&d.SessionsToday)
	if err != nil {
		d.SessionsToday = 0
	}

	// Athletes today
	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT athlete_id) FROM coach_appointments
		 WHERE coach_id = ? AND date(start_time) = date('now')`, coachID).Scan(&d.AthletesToday)
	if err != nil {
		d.AthletesToday = 0
	}

	// Completed today
	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coach_appointments
		 WHERE coach_id = ? AND date(start_time) = date('now') AND status = 'completed'`, coachID).Scan(&d.CompletedToday)
	if err != nil {
		d.CompletedToday = 0
	}

	d.Date = "" // Will be set by caller
	return d, nil
}

// GetTimeBlocks retrieves all time blocks for a coach.
func (r *Repository) GetTimeBlocks(ctx context.Context, coachID string) ([]*TimeBlock, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, coach_id, title, block_type, start_time, end_time, recurrence, color, created_at, updated_at
		 FROM coach_time_blocks WHERE coach_id = ?
		 ORDER BY start_time`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to get time blocks: %w", err)
	}
	defer rows.Close()

	var blocks []*TimeBlock
	for rows.Next() {
		b := &TimeBlock{}
		var recurrence, color sql.NullString
		if err := rows.Scan(&b.ID, &b.CoachID, &b.Title, &b.BlockType,
			&b.StartTime, &b.EndTime, &recurrence, &color, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan time block: %w", err)
		}
		if recurrence.Valid {
			b.Recurrence = recurrence.String
		}
		if color.Valid {
			b.Color = color.String
		}
		blocks = append(blocks, b)
	}
	return blocks, nil
}

// SaveTimeBlocks replaces all time blocks for a coach (transactional delete + insert).
func (r *Repository) SaveTimeBlocks(ctx context.Context, coachID string, blocks []*TimeBlock) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete existing blocks
	_, err = tx.ExecContext(ctx, `DELETE FROM coach_time_blocks WHERE coach_id = ?`, coachID)
	if err != nil {
		return fmt.Errorf("failed to delete time blocks: %w", err)
	}

	// Insert new blocks
	for _, b := range blocks {
		b.ID = uuid.New().String()
		b.CoachID = coachID

		var recurrence, color sql.NullString
		if b.Recurrence != "" {
			recurrence = sql.NullString{String: b.Recurrence, Valid: true}
		}
		if b.Color != "" {
			color = sql.NullString{String: b.Color, Valid: true}
		}

		_, err = tx.ExecContext(ctx,
			`INSERT INTO coach_time_blocks (id, coach_id, title, block_type, start_time, end_time, recurrence, color)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			b.ID, b.CoachID, b.Title, b.BlockType, b.StartTime, b.EndTime, recurrence, color)
		if err != nil {
			return fmt.Errorf("failed to insert time block: %w", err)
		}
	}

	return tx.Commit()
}

// GetAppointments retrieves all appointments for a coach.
func (r *Repository) GetAppointments(ctx context.Context, coachID string) ([]*Appointment, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, coach_id, athlete_id, athlete_name, title, status, start_time, end_time, notes, created_at, updated_at
		 FROM coach_appointments WHERE coach_id = ?
		 ORDER BY start_time`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to get appointments: %w", err)
	}
	defer rows.Close()

	var apts []*Appointment
	for rows.Next() {
		a := &Appointment{}
		var athleteName, notes sql.NullString
		if err := rows.Scan(&a.ID, &a.CoachID, &a.AthleteID, &athleteName, &a.Title,
			&a.Status, &a.StartTime, &a.EndTime, &notes, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan appointment: %w", err)
		}
		if athleteName.Valid {
			a.AthleteName = athleteName.String
		}
		if notes.Valid {
			a.Notes = notes.String
		}
		apts = append(apts, a)
	}
	return apts, nil
}

// CreateAppointment creates a new appointment.
func (r *Repository) CreateAppointment(ctx context.Context, a *Appointment) error {
	a.ID = uuid.New().String()

	var athleteName, notes sql.NullString
	if a.AthleteName != "" {
		athleteName = sql.NullString{String: a.AthleteName, Valid: true}
	}
	if a.Notes != "" {
		notes = sql.NullString{String: a.Notes, Valid: true}
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO coach_appointments (id, coach_id, athlete_id, athlete_name, title, status, start_time, end_time, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.CoachID, a.AthleteID, athleteName, a.Title, a.Status, a.StartTime, a.EndTime, notes)
	if err != nil {
		return fmt.Errorf("failed to create appointment: %w", err)
	}
	return nil
}

// UpdateAppointment updates an appointment's status and notes.
func (r *Repository) UpdateAppointment(ctx context.Context, id string, a *Appointment) error {
	var notes sql.NullString
	if a.Notes != "" {
		notes = sql.NullString{String: a.Notes, Valid: true}
	}

	result, err := r.db.ExecContext(ctx,
		`UPDATE coach_appointments SET status = ?, notes = ?, updated_at = datetime('now')
		 WHERE id = ?`, a.Status, notes, id)
	if err != nil {
		return fmt.Errorf("failed to update appointment: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("appointment not found")
	}
	return nil
}

// GetAvailability retrieves availability slots for a coach.
func (r *Repository) GetAvailability(ctx context.Context, coachID string) ([]*CoachAvailability, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, coach_id, day_of_week, start_time, end_time, is_active, created_at
		 FROM coach_availability WHERE coach_id = ?
		 ORDER BY day_of_week, start_time`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to get availability: %w", err)
	}
	defer rows.Close()

	var slots []*CoachAvailability
	for rows.Next() {
		s := &CoachAvailability{}
		if err := rows.Scan(&s.ID, &s.CoachID, &s.DayOfWeek, &s.StartTime,
			&s.EndTime, &s.IsActive, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan availability: %w", err)
		}
		slots = append(slots, s)
	}
	return slots, nil
}

// SaveAvailability replaces all availability slots for a coach (transactional delete + insert).
func (r *Repository) SaveAvailability(ctx context.Context, coachID string, slots []*CoachAvailability) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete existing slots
	_, err = tx.ExecContext(ctx, `DELETE FROM coach_availability WHERE coach_id = ?`, coachID)
	if err != nil {
		return fmt.Errorf("failed to delete availability: %w", err)
	}

	// Insert new slots
	for _, s := range slots {
		s.ID = uuid.New().String()
		s.CoachID = coachID

		_, err = tx.ExecContext(ctx,
			`INSERT INTO coach_availability (id, coach_id, day_of_week, start_time, end_time, is_active)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			s.ID, s.CoachID, s.DayOfWeek, s.StartTime, s.EndTime, s.IsActive)
		if err != nil {
			return fmt.Errorf("failed to insert availability: %w", err)
		}
	}

	return tx.Commit()
}
