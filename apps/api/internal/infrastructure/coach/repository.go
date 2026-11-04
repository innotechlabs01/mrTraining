package coach

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	coachdomain "github.com/innotechlabs01/mr-training-api/internal/domain/coach"
)

// Repository implements coach.Repository using database/sql with Turso/libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new coach repository with the given database connection.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool. Methods that open their own transaction (SaveTimeBlocks,
// SaveAvailability) detect this and skip internal transaction management.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries. This allows request-scoped
// transactional usage without mutating the shared repository instance.
func (r *Repository) WithExecutor(exec database.Executor) *Repository {
	return &Repository{
		db:  r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// GetDashboard retrieves aggregated dashboard metrics for a coach.
func (r *Repository) GetDashboard(ctx context.Context, coachID string) (*coachdomain.Dashboard, error) {
	d := &coachdomain.Dashboard{}

	// Count total athletes
	err := r.exec.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT athlete_id) FROM coach_athletes WHERE coach_id = $1`, coachID).Scan(&d.TotalAthletes)
	if err != nil {
		return nil, fmt.Errorf("failed to count athletes: %w", err)
	}

	// Count active workouts
	err = r.exec.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM assigned_workouts WHERE coach_id = $1 AND status = 'active'`, coachID).Scan(&d.ActiveWorkouts)
	if err != nil {
		return nil, fmt.Errorf("failed to count active workouts: %w", err)
	}

	// Calculate completion rate from workout sessions
	err = r.exec.QueryRowContext(ctx,
		`SELECT COALESCE(
			(SELECT CAST(COUNT(CASE WHEN completed = 1 THEN 1 END) AS REAL) * 100.0 / NULLIF(COUNT(*), 0)
			FROM workout_session_logs wsl
			JOIN assigned_workouts aw ON wsl.workout_id = aw.id
			WHERE aw.coach_id = $1), 0)`, coachID).Scan(&d.CompletionRate)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate completion rate: %w", err)
	}

	// Count upcoming sessions (appointments in the future)
	err = r.exec.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coach_appointments
 		 WHERE coach_id = $1 AND status = 'scheduled' AND start_time > NOW()`, coachID).Scan(&d.UpcomingSessions)
	if err != nil {
		// Table might not exist yet — return 0
		d.UpcomingSessions = 0
	}

	return d, nil
}

// GetDailySummary retrieves today's summary for a coach.
func (r *Repository) GetDailySummary(ctx context.Context, coachID string) (*coachdomain.DailySummary, error) {
	d := &coachdomain.DailySummary{Date: "CURRENT_DATE"}

	// Sessions today
	err := r.exec.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coach_appointments
 		 WHERE coach_id = $1 AND date(start_time) = CURRENT_DATE`, coachID).Scan(&d.SessionsToday)
	if err != nil {
		d.SessionsToday = 0
	}

	// Athletes today
	err = r.exec.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT athlete_id) FROM coach_appointments
 		 WHERE coach_id = $1 AND date(start_time) = CURRENT_DATE`, coachID).Scan(&d.AthletesToday)
	if err != nil {
		d.AthletesToday = 0
	}

	// Completed today
	err = r.exec.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coach_appointments
 		 WHERE coach_id = $1 AND date(start_time) = CURRENT_DATE AND status = 'completed'`, coachID).Scan(&d.CompletedToday)
	if err != nil {
		d.CompletedToday = 0
	}

	d.Date = "" // Will be set by caller
	return d, nil
}

// GetTimeBlocks retrieves all time blocks for a coach.
func (r *Repository) GetTimeBlocks(ctx context.Context, coachID string) ([]*coachdomain.TimeBlock, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, coach_id, title, block_type, start_time, end_time, recurrence, color, created_at, updated_at
 		 FROM coach_time_blocks WHERE coach_id = $1
 		 ORDER BY start_time`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to get time blocks: %w", err)
	}
	defer rows.Close()

	var blocks []*coachdomain.TimeBlock
	for rows.Next() {
		b := &coachdomain.TimeBlock{}
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
func (r *Repository) SaveTimeBlocks(ctx context.Context, coachID string, blocks []*coachdomain.TimeBlock) error {
	// If running inside a UnitOfWork transaction, use the injected executor
	// and let the caller manage commit/rollback.
	if r.isTx() {
		// Delete existing blocks
		_, err := r.exec.ExecContext(ctx, `DELETE FROM coach_time_blocks WHERE coach_id = $1`, coachID)
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

			_, err = r.exec.ExecContext(ctx,
				`INSERT INTO coach_time_blocks (id, coach_id, title, block_type, start_time, end_time, recurrence, color)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				b.ID, b.CoachID, b.Title, b.BlockType, b.StartTime, b.EndTime, recurrence, color)
			if err != nil {
				return fmt.Errorf("failed to insert time block: %w", err)
			}
		}
		return nil
	}

	// Standalone mode: manage our own transaction.
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete existing blocks
	_, err = tx.ExecContext(ctx, `DELETE FROM coach_time_blocks WHERE coach_id = $1`, coachID)
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
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			b.ID, b.CoachID, b.Title, b.BlockType, b.StartTime, b.EndTime, recurrence, color)
		if err != nil {
			return fmt.Errorf("failed to insert time block: %w", err)
		}
	}

	return tx.Commit()
}

// GetAppointments retrieves all appointments for a coach.
func (r *Repository) GetAppointments(ctx context.Context, coachID string) ([]*coachdomain.Appointment, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, coach_id, athlete_id, athlete_name, title, status, start_time, end_time, notes, created_at, updated_at
 		 FROM coach_appointments WHERE coach_id = $1
 		 ORDER BY start_time`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to get appointments: %w", err)
	}
	defer rows.Close()

	var apts []*coachdomain.Appointment
	for rows.Next() {
		a := &coachdomain.Appointment{}
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
func (r *Repository) CreateAppointment(ctx context.Context, a *coachdomain.Appointment) error {
	a.ID = uuid.New().String()

	var athleteName, notes sql.NullString
	if a.AthleteName != "" {
		athleteName = sql.NullString{String: a.AthleteName, Valid: true}
	}
	if a.Notes != "" {
		notes = sql.NullString{String: a.Notes, Valid: true}
	}

	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO coach_appointments (id, coach_id, athlete_id, athlete_name, title, status, start_time, end_time, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		a.ID, a.CoachID, a.AthleteID, athleteName, a.Title, a.Status, a.StartTime, a.EndTime, notes)
	if err != nil {
		return fmt.Errorf("failed to create appointment: %w", err)
	}
	return nil
}

// UpdateAppointment updates an appointment's status and notes.
func (r *Repository) UpdateAppointment(ctx context.Context, id string, a *coachdomain.Appointment) error {
	var notes sql.NullString
	if a.Notes != "" {
		notes = sql.NullString{String: a.Notes, Valid: true}
	}

	result, err := r.exec.ExecContext(ctx,
		`UPDATE coach_appointments SET status = $1, notes = $2, updated_at = NOW()
		 WHERE id = $3`, a.Status, notes, id)
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
func (r *Repository) GetAvailability(ctx context.Context, coachID string) ([]*coachdomain.CoachAvailability, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, coach_id, day_of_week, start_time, end_time, is_active, created_at
 		 FROM coach_availability WHERE coach_id = $1
 		 ORDER BY day_of_week, start_time`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to get availability: %w", err)
	}
	defer rows.Close()

	var slots []*coachdomain.CoachAvailability
	for rows.Next() {
		s := &coachdomain.CoachAvailability{}
		if err := rows.Scan(&s.ID, &s.CoachID, &s.DayOfWeek, &s.StartTime,
			&s.EndTime, &s.IsActive, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan availability: %w", err)
		}
		slots = append(slots, s)
	}
	return slots, nil
}

// SaveAvailability replaces all availability slots for a coach (transactional delete + insert).
func (r *Repository) SaveAvailability(ctx context.Context, coachID string, slots []*coachdomain.CoachAvailability) error {
	// If running inside a UnitOfWork transaction, use the injected executor.
	if r.isTx() {
		// Delete existing slots
		_, err := r.exec.ExecContext(ctx, `DELETE FROM coach_availability WHERE coach_id = $1`, coachID)
		if err != nil {
			return fmt.Errorf("failed to delete availability: %w", err)
		}

		// Insert new slots
		for _, s := range slots {
			s.ID = uuid.New().String()
			s.CoachID = coachID

			_, err = r.exec.ExecContext(ctx,
				`INSERT INTO coach_availability (id, coach_id, day_of_week, start_time, end_time, is_active)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				s.ID, s.CoachID, s.DayOfWeek, s.StartTime, s.EndTime, s.IsActive)
			if err != nil {
				return fmt.Errorf("failed to insert availability: %w", err)
			}
		}
		return nil
	}

	// Standalone mode: manage our own transaction.
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete existing slots
	_, err = tx.ExecContext(ctx, `DELETE FROM coach_availability WHERE coach_id = $1`, coachID)
	if err != nil {
		return fmt.Errorf("failed to delete availability: %w", err)
	}

	// Insert new slots
	for _, s := range slots {
		s.ID = uuid.New().String()
		s.CoachID = coachID

		_, err = tx.ExecContext(ctx,
			`INSERT INTO coach_availability (id, coach_id, day_of_week, start_time, end_time, is_active)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			s.ID, s.CoachID, s.DayOfWeek, s.StartTime, s.EndTime, s.IsActive)
		if err != nil {
			return fmt.Errorf("failed to insert availability: %w", err)
		}
	}

	return tx.Commit()
}

// GetBySlug retrieves a coach by slug.
func (r *Repository) GetBySlug(ctx context.Context, slug string) (*coachdomain.Coach, error) {
	d := &coachdomain.Coach{}

	var specializationsStr string
	var isActiveInt int

	err := r.exec.QueryRowContext(ctx,
		`SELECT id, name, slug, avatar_url, bio, specializations, is_active, created_at, updated_at
 		 FROM coaches WHERE slug = $1`, slug).Scan(&d.ID, &d.Name, &d.Slug, &d.PhotoURL, &d.Biography, &specializationsStr, &isActiveInt, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get coach by slug: %w", err)
	}

	// Parse specializations from text format
	if specializationsStr != "" && specializationsStr != "[]" {
		// Simple split by comma if it's a comma-separated list
		parts := strings.Split(specializationsStr, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				d.Specialities = append(d.Specialities, p)
			}
		}
	}

	// Convert integer to boolean for is_active
	d.IsActive = isActiveInt != 0

	return d, nil
}
