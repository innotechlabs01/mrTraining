package gamification

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/gamification"
)

// Repository implements the gamification.Repository interface using libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new gamification repository.
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
func (r *Repository) WithExecutor(exec database.Executor) gamification.Repository {
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

// GetStreak returns the athlete's streak data.
func (r *Repository) GetStreak(ctx context.Context, athleteID string) (*gamification.Streak, error) {
	if r.exec == nil {
		return nil, nil
	}
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, athlete_id, current_streak, longest_streak, last_workout_date, created_at, updated_at
		FROM gamification_streaks
		WHERE athlete_id = $1
	`, athleteID)

	var s gamification.Streak
	var lastWorkoutDate sql.NullString
	err := row.Scan(&s.ID, &s.AthleteID, &s.CurrentStreak, &s.LongestStreak, &lastWorkoutDate, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") || err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get streak: %w", err)
	}
	if lastWorkoutDate.Valid {
		s.LastWorkoutDate = &lastWorkoutDate.String
	}
	return &s, nil
}

// UpsertStreak creates or updates streak data.
func (r *Repository) UpsertStreak(ctx context.Context, streak *gamification.Streak) error {
	if r.exec == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO gamification_streaks (id, athlete_id, current_streak, longest_streak, last_workout_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT(athlete_id) DO UPDATE SET
			current_streak = excluded.current_streak,
			longest_streak = excluded.longest_streak,
			last_workout_date = excluded.last_workout_date,
			updated_at = excluded.updated_at
	`, streak.ID, streak.AthleteID, streak.CurrentStreak, streak.LongestStreak, streak.LastWorkoutDate, streak.CreatedAt, streak.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to upsert streak: %w", err)
	}
	return nil
}

// LogWorkoutDay records a workout day.
func (r *Repository) LogWorkoutDay(ctx context.Context, day *gamification.WorkoutDay) error {
	if r.exec == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO gamification_workout_days (id, athlete_id, workout_date, workout_id, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, day.ID, day.AthleteID, day.WorkoutDate, day.WorkoutID, day.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to log workout day: %w", err)
	}
	return nil
}

// ListWorkoutDays returns workout days for an athlete, optionally filtered by date.
func (r *Repository) ListWorkoutDays(ctx context.Context, athleteID string, since string) ([]*gamification.WorkoutDay, error) {
	if r.exec == nil {
		return []*gamification.WorkoutDay{}, nil
	}
	query := `
		SELECT id, athlete_id, workout_date, workout_id, created_at
		FROM gamification_workout_days
		WHERE athlete_id = $1
	`
	args := []interface{}{athleteID}
	if since != "" {
		query += " AND workout_date >= $15"
		args = append(args, since)
	}
	query += " ORDER BY workout_date ASC"

	rows, err := r.exec.QueryContext(ctx, query, args...)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*gamification.WorkoutDay{}, nil
		}
		return nil, fmt.Errorf("failed to list workout days: %w", err)
	}
	defer rows.Close()

	var days []*gamification.WorkoutDay
	for rows.Next() {
		var d gamification.WorkoutDay
		var workoutID sql.NullString
		if err := rows.Scan(&d.ID, &d.AthleteID, &d.WorkoutDate, &workoutID, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan workout day: %w", err)
		}
		if workoutID.Valid {
			d.WorkoutID = &workoutID.String
		}
		days = append(days, &d)
	}
	if days == nil {
		days = []*gamification.WorkoutDay{}
	}
	return days, nil
}

// ListBadges returns all badges for an athlete.
func (r *Repository) ListBadges(ctx context.Context, athleteID string) ([]*gamification.Badge, error) {
	if r.exec == nil {
		return []*gamification.Badge{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, badge_id, unlocked_at
		FROM gamification_badges
		WHERE athlete_id = $1
		ORDER BY unlocked_at DESC
	`, athleteID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*gamification.Badge{}, nil
		}
		return nil, fmt.Errorf("failed to list badges: %w", err)
	}
	defer rows.Close()

	var badges []*gamification.Badge
	for rows.Next() {
		var b gamification.Badge
		if err := rows.Scan(&b.ID, &b.AthleteID, &b.BadgeID, &b.UnlockedAt); err != nil {
			return nil, fmt.Errorf("failed to scan badge: %w", err)
		}
		badges = append(badges, &b)
	}
	if badges == nil {
		badges = []*gamification.Badge{}
	}
	return badges, nil
}

// UpsertBadge creates or updates a badge.
func (r *Repository) UpsertBadge(ctx context.Context, badge *gamification.Badge) error {
	if r.exec == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO gamification_badges (id, athlete_id, badge_id, unlocked_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT(athlete_id, badge_id) DO UPDATE SET
			unlocked_at = excluded.unlocked_at
	`, badge.ID, badge.AthleteID, badge.BadgeID, badge.UnlockedAt)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to upsert badge: %w", err)
	}
	return nil
}

// ListAllStreaks returns all streak records (used by the inactivity retention job).
func (r *Repository) ListAllStreaks(ctx context.Context) ([]*gamification.Streak, error) {
	if r.exec == nil {
		return []*gamification.Streak{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, current_streak, longest_streak, last_workout_date, created_at, updated_at
		FROM gamification_streaks
		ORDER BY athlete_id
	`)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*gamification.Streak{}, nil
		}
		return nil, fmt.Errorf("failed to list all streaks: %w", err)
	}
	defer rows.Close()

	var streaks []*gamification.Streak
	for rows.Next() {
		var s gamification.Streak
		var lastWorkoutDate sql.NullString
		if err := rows.Scan(&s.ID, &s.AthleteID, &s.CurrentStreak, &s.LongestStreak, &lastWorkoutDate, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan streak: %w", err)
		}
		if lastWorkoutDate.Valid {
			s.LastWorkoutDate = &lastWorkoutDate.String
		}
		streaks = append(streaks, &s)
	}
	if streaks == nil {
		streaks = []*gamification.Streak{}
	}
	return streaks, nil
}

// ListPRs returns all personal records for an athlete.
func (r *Repository) ListPRs(ctx context.Context, athleteID string) ([]*gamification.PersonalRecord, error) {
	if r.exec == nil {
		return []*gamification.PersonalRecord{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best
		FROM gamification_prs
		WHERE athlete_id = $1
		ORDER BY achieved_at DESC
	`, athleteID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*gamification.PersonalRecord{}, nil
		}
		return nil, fmt.Errorf("failed to list PRs: %w", err)
	}
	defer rows.Close()

	var prs []*gamification.PersonalRecord
	for rows.Next() {
		var pr gamification.PersonalRecord
		var previousBest sql.NullFloat64
		if err := rows.Scan(&pr.ID, &pr.AthleteID, &pr.ExerciseID, &pr.BestValue, &pr.Unit, &pr.AchievedAt, &previousBest); err != nil {
			return nil, fmt.Errorf("failed to scan PR: %w", err)
		}
		if previousBest.Valid {
			pr.PreviousBest = &previousBest.Float64
		}
		prs = append(prs, &pr)
	}
	if prs == nil {
		prs = []*gamification.PersonalRecord{}
	}
	return prs, nil
}

// GetPR returns a specific PR by athlete and exercise.
func (r *Repository) GetPR(ctx context.Context, athleteID, exerciseID string) (*gamification.PersonalRecord, error) {
	if r.exec == nil {
		return nil, nil
	}
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best
		FROM gamification_prs
		WHERE athlete_id = $1 AND exercise_id = $2
	`, athleteID, exerciseID)

	var pr gamification.PersonalRecord
	var previousBest sql.NullFloat64
	err := row.Scan(&pr.ID, &pr.AthleteID, &pr.ExerciseID, &pr.BestValue, &pr.Unit, &pr.AchievedAt, &previousBest)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") || err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get PR: %w", err)
	}
	if previousBest.Valid {
		pr.PreviousBest = &previousBest.Float64
	}
	return &pr, nil
}

// UpsertPR creates or updates a personal record.
func (r *Repository) UpsertPR(ctx context.Context, pr *gamification.PersonalRecord) error {
	if r.exec == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO gamification_prs (id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT(athlete_id, exercise_id) DO UPDATE SET
			best_value = excluded.best_value,
			unit = excluded.unit,
			achieved_at = excluded.achieved_at,
			previous_best = excluded.previous_best
	`, pr.ID, pr.AthleteID, pr.ExerciseID, pr.BestValue, pr.Unit, pr.AchievedAt, pr.PreviousBest)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to upsert PR: %w", err)
	}
	return nil
}
