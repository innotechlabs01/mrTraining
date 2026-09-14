package gamification

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/gamification"
)

// Repository implements the gamification.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new gamification repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetStreak returns the athlete's streak data.
func (r *Repository) GetStreak(ctx context.Context, athleteID string) (*gamification.Streak, error) {
	if r.db == nil {
		return nil, nil
	}
	row := r.db.QueryRowContext(ctx, `
		SELECT id, athlete_id, current_streak, longest_streak, last_workout_date, created_at, updated_at
		FROM gamification_streaks
		WHERE athlete_id = ?
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
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO gamification_streaks (id, athlete_id, current_streak, longest_streak, last_workout_date, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
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
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO gamification_workout_days (id, athlete_id, workout_date, workout_id, created_at)
		VALUES (?, ?, ?, ?, ?)
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
	if r.db == nil {
		return []*gamification.WorkoutDay{}, nil
	}
	query := `
		SELECT id, athlete_id, workout_date, workout_id, created_at
		FROM gamification_workout_days
		WHERE athlete_id = ?
	`
	args := []interface{}{athleteID}
	if since != "" {
		query += " AND workout_date >= ?"
		args = append(args, since)
	}
	query += " ORDER BY workout_date ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
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
	if r.db == nil {
		return []*gamification.Badge{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, badge_id, unlocked_at
		FROM gamification_badges
		WHERE athlete_id = ?
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
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO gamification_badges (id, athlete_id, badge_id, unlocked_at)
		VALUES (?, ?, ?, ?)
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

// ListPRs returns all personal records for an athlete.
func (r *Repository) ListPRs(ctx context.Context, athleteID string) ([]*gamification.PersonalRecord, error) {
	if r.db == nil {
		return []*gamification.PersonalRecord{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best
		FROM gamification_prs
		WHERE athlete_id = ?
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
	if r.db == nil {
		return nil, nil
	}
	row := r.db.QueryRowContext(ctx, `
		SELECT id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best
		FROM gamification_prs
		WHERE athlete_id = ? AND exercise_id = ?
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
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO gamification_prs (id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best)
		VALUES (?, ?, ?, ?, ?, ?, ?)
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
