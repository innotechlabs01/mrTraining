package training

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// ProgramRepository implements training.ProgramRepository using database/sql with Turso/libsql.
type ProgramRepository struct {
	db *sql.DB
}

// NewProgramRepository creates a new program repository with the given database connection.
func NewProgramRepository(db *sql.DB) *ProgramRepository {
	return &ProgramRepository{db: db}
}

// ListByCoach retrieves all programs owned by a coach with their workouts.
func (r *ProgramRepository) ListByCoach(ctx context.Context, coachID string) ([]*training.Program, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT p.id, p.coach_id, p.name, p.description, p.goal, p.difficulty_level,
		 p.duration_weeks, p.created_at, p.updated_at,
		 (SELECT COUNT(*) FROM program_workouts pw WHERE pw.program_id = p.id)
		 FROM programs p WHERE p.coach_id = ?
		 ORDER BY p.created_at DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list programs: %w", err)
	}
	defer rows.Close()

	var programs []*training.Program
	for rows.Next() {
		p := &training.Program{}
		if err := rows.Scan(&p.ID, &p.CoachID, &p.Name, &p.Description, &p.Goal,
			&p.DifficultyLevel, &p.DurationWeeks, &p.CreatedAt, &p.UpdatedAt,
			&p.WorkoutCount); err != nil {
			return nil, fmt.Errorf("failed to scan program: %w", err)
		}
		programs = append(programs, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate programs: %w", err)
	}

	for _, p := range programs {
		workouts, err := r.getProgramWorkouts(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		p.Workouts = workouts
	}
	return programs, nil
}

// GetByID retrieves a program with its ordered workouts.
func (r *ProgramRepository) GetByID(ctx context.Context, id string) (*training.Program, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, coach_id, name, description, goal, difficulty_level,
		 duration_weeks, created_at, updated_at
		 FROM programs WHERE id = ?`, id)

	p := &training.Program{}
	err := row.Scan(&p.ID, &p.CoachID, &p.Name, &p.Description, &p.Goal,
		&p.DifficultyLevel, &p.DurationWeeks, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Program", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get program: %w", err)
	}

	workouts, err := r.getProgramWorkouts(ctx, id)
	if err != nil {
		return nil, err
	}
	p.Workouts = workouts
	p.WorkoutCount = len(workouts)
	return p, nil
}

// Create inserts a new program with its ordered workouts.
func (r *ProgramRepository) Create(ctx context.Context, p *training.Program) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`INSERT INTO programs (id, coach_id, name, description, goal, difficulty_level, duration_weeks)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.CoachID, p.Name, p.Description, p.Goal, p.DifficultyLevel, p.DurationWeeks)
	if err != nil {
		return fmt.Errorf("failed to create program: %w", err)
	}

	for i, w := range p.Workouts {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO program_workouts (id, program_id, template_id, order_index)
			 VALUES (?, ?, ?, ?)`,
			uuid.New().String(), p.ID, w.TemplateID, i); err != nil {
			return fmt.Errorf("failed to create program workout: %w", err)
		}
	}

	return tx.Commit()
}

// Update updates an existing program and replaces its ordered workouts.
func (r *ProgramRepository) Update(ctx context.Context, p *training.Program) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx,
		`UPDATE programs SET name = ?, description = ?, goal = ?, difficulty_level = ?,
		 duration_weeks = ?, updated_at = datetime('now') WHERE id = ?`,
		p.Name, p.Description, p.Goal, p.DifficultyLevel, p.DurationWeeks, p.ID)
	if err != nil {
		return fmt.Errorf("failed to update program: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if affected == 0 {
		return errors.NotFound("Program", p.ID)
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM program_workouts WHERE program_id = ?`, p.ID); err != nil {
		return fmt.Errorf("failed to delete old program workouts: %w", err)
	}

	for i, w := range p.Workouts {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO program_workouts (id, program_id, template_id, order_index)
			 VALUES (?, ?, ?, ?)`,
			uuid.New().String(), p.ID, w.TemplateID, i); err != nil {
			return fmt.Errorf("failed to create program workout: %w", err)
		}
	}

	return tx.Commit()
}

// Delete removes a program and its workout references.
func (r *ProgramRepository) Delete(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM program_workouts WHERE program_id = ?`, id); err != nil {
		return fmt.Errorf("failed to delete program workouts: %w", err)
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM programs WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete program: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if affected == 0 {
		return errors.NotFound("Program", id)
	}

	return tx.Commit()
}

// getProgramWorkouts loads the ordered workout references for a program,
// joining the template name when the template still exists.
func (r *ProgramRepository) getProgramWorkouts(ctx context.Context, programID string) ([]training.ProgramWorkout, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT pw.template_id, pw.order_index, COALESCE(wt.name, '')
		 FROM program_workouts pw
		 LEFT JOIN workout_templates wt ON wt.id = pw.template_id
		 WHERE pw.program_id = ?
		 ORDER BY pw.order_index`, programID)
	if err != nil {
		return nil, fmt.Errorf("failed to list program workouts: %w", err)
	}
	defer rows.Close()

	workouts := make([]training.ProgramWorkout, 0)
	for rows.Next() {
		w := training.ProgramWorkout{}
		if err := rows.Scan(&w.TemplateID, &w.OrderIndex, &w.Name); err != nil {
			return nil, fmt.Errorf("failed to scan program workout: %w", err)
		}
		workouts = append(workouts, w)
	}
	return workouts, rows.Err()
}