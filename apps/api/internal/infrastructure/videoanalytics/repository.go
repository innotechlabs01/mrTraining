package videoanalytics

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/videoanalytics"
)

// Repository implements the videoanalytics.Repository interface.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new video analytics repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateSession(ctx context.Context, session *domain.SessionAnalysis) error {
	if r.db == nil {
		return nil
	}
	now := time.Now()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO video_analytics_sessions (id, athlete_id, workout_id, exercise_id, exercise_name, duration_sec, rep_count, avg_form_score, min_form_score, max_form_score, video_url, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, session.ID, session.AthleteID, session.WorkoutID, session.ExerciseID, session.ExerciseName,
		session.DurationSec, session.RepCount, session.AvgFormScore, session.MinFormScore,
		session.MaxFormScore, session.VideoURL, session.Status, now, now)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

func (r *Repository) GetSession(ctx context.Context, sessionID string) (*domain.SessionAnalysis, error) {
	if r.db == nil {
		return nil, nil
	}
	s := &domain.SessionAnalysis{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, athlete_id, workout_id, exercise_id, exercise_name, duration_sec, rep_count, avg_form_score, min_form_score, max_form_score, video_url, status, created_at, updated_at
		FROM video_analytics_sessions
		WHERE id = ?
	`, sessionID).Scan(&s.ID, &s.AthleteID, &s.WorkoutID, &s.ExerciseID, &s.ExerciseName,
		&s.DurationSec, &s.RepCount, &s.AvgFormScore, &s.MinFormScore,
		&s.MaxFormScore, &s.VideoURL, &s.Status, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return s, nil
}

func (r *Repository) ListSessionsByAthlete(ctx context.Context, athleteID string, limit int, offset int) ([]*domain.SessionAnalysis, error) {
	if r.db == nil {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, workout_id, exercise_id, exercise_name, duration_sec, rep_count, avg_form_score, min_form_score, max_form_score, video_url, status, created_at, updated_at
		FROM video_analytics_sessions
		WHERE athlete_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, athleteID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*domain.SessionAnalysis
	for rows.Next() {
		s := &domain.SessionAnalysis{}
		if err := rows.Scan(&s.ID, &s.AthleteID, &s.WorkoutID, &s.ExerciseID, &s.ExerciseName,
			&s.DurationSec, &s.RepCount, &s.AvgFormScore, &s.MinFormScore,
			&s.MaxFormScore, &s.VideoURL, &s.Status, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *Repository) ListSessionsByExercise(ctx context.Context, athleteID string, exerciseID string, limit int) ([]*domain.SessionAnalysis, error) {
	if r.db == nil {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, workout_id, exercise_id, exercise_name, duration_sec, rep_count, avg_form_score, min_form_score, max_form_score, video_url, status, created_at, updated_at
		FROM video_analytics_sessions
		WHERE athlete_id = ? AND exercise_id = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, athleteID, exerciseID, limit)
	if err != nil {
		return nil, fmt.Errorf("list sessions by exercise: %w", err)
	}
	defer rows.Close()

	var sessions []*domain.SessionAnalysis
	for rows.Next() {
		s := &domain.SessionAnalysis{}
		if err := rows.Scan(&s.ID, &s.AthleteID, &s.WorkoutID, &s.ExerciseID, &s.ExerciseName,
			&s.DurationSec, &s.RepCount, &s.AvgFormScore, &s.MinFormScore,
			&s.MaxFormScore, &s.VideoURL, &s.Status, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *Repository) GetSummary(ctx context.Context, athleteID string) (*domain.AnalyticsSummary, error) {
	if r.db == nil {
		return nil, nil
	}
	summary := &domain.AnalyticsSummary{}
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*) as total_sessions,
			COALESCE(SUM(rep_count), 0) as total_reps,
			COALESCE(AVG(avg_form_score), 0) as avg_form_score,
			COALESCE(SUM(duration_sec) / 60, 0) as total_duration_min,
			COUNT(DISTINCT exercise_id) as exercise_count
		FROM video_analytics_sessions
		WHERE athlete_id = ?
	`, athleteID).Scan(&summary.TotalSessions, &summary.TotalReps, &summary.AvgFormScore,
		&summary.TotalDurationMin, &summary.ExerciseCount)
	if err != nil {
		return nil, fmt.Errorf("get summary: %w", err)
	}
	return summary, nil
}

func (r *Repository) GetPerExercise(ctx context.Context, athleteID string) ([]*domain.ExerciseAnalytics, error) {
	if r.db == nil {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			exercise_id,
			exercise_name,
			COUNT(*) as total_sessions,
			COALESCE(SUM(rep_count), 0) as total_reps,
			COALESCE(AVG(avg_form_score), 0) as avg_form_score,
			COALESCE(MAX(avg_form_score), 0) as best_form_score,
			COALESCE(AVG(duration_sec), 0) as avg_duration
		FROM video_analytics_sessions
		WHERE athlete_id = ?
		GROUP BY exercise_id, exercise_name
		ORDER BY total_sessions DESC
	`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("get per exercise: %w", err)
	}
	defer rows.Close()

	var analytics []*domain.ExerciseAnalytics
	for rows.Next() {
		a := &domain.ExerciseAnalytics{}
		if err := rows.Scan(&a.ExerciseID, &a.ExerciseName, &a.TotalSessions, &a.TotalReps,
			&a.AvgFormScore, &a.BestFormScore, &a.AvgDuration); err != nil {
			return nil, fmt.Errorf("scan analytics: %w", err)
		}
		analytics = append(analytics, a)
	}
	return analytics, nil
}
