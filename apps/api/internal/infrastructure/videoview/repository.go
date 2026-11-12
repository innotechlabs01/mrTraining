package videoview

import (
	"context"
	"database/sql"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/videoview"
)

// Repository implements the videoview.Repository interface using libsql.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new video view repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// RecordVideoView inserts a video view event.
func (r *Repository) RecordVideoView(ctx context.Context, vv *videoview.VideoView) error {
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO video_views (id, athlete_id, exercise_id, action, progress_pct, watch_duration_seconds, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`, vv.ID, vv.AthleteID, vv.ExerciseID, vv.Action, vv.ProgressPct, vv.WatchDuration)
	if err != nil {
		return fmt.Errorf("failed to record video view: %w", err)
	}
	return nil
}

// ListVideoViews returns video views for an athlete, optionally filtered by exercise.
func (r *Repository) ListVideoViews(ctx context.Context, athleteID, exerciseID string) ([]*videoview.VideoView, error) {
	var rows *sql.Rows
	var err error

	if exerciseID != "" {
		rows, err = r.exec.QueryContext(ctx, `
			SELECT id, athlete_id, exercise_id, action, progress_pct, watch_duration_seconds, created_at
			FROM video_views
			WHERE athlete_id = $1 AND exercise_id = $2
			ORDER BY created_at DESC
			LIMIT 100
		`, athleteID, exerciseID)
	} else {
		rows, err = r.exec.QueryContext(ctx, `
			SELECT id, athlete_id, exercise_id, action, progress_pct, watch_duration_seconds, created_at
			FROM video_views
			WHERE athlete_id = $1
			ORDER BY created_at DESC
			LIMIT 100
		`, athleteID)
	}
	if err != nil {
		return []*videoview.VideoView{}, nil
	}
	defer rows.Close()

	var views []*videoview.VideoView
	for rows.Next() {
		var vv videoview.VideoView
		var progressPct, watchDuration sql.NullInt32
		if err := rows.Scan(&vv.ID, &vv.AthleteID, &vv.ExerciseID, &vv.Action, &progressPct, &watchDuration, &vv.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan video view: %w", err)
		}
		if progressPct.Valid {
			v := int(progressPct.Int32)
			vv.ProgressPct = &v
		}
		if watchDuration.Valid {
			v := int(watchDuration.Int32)
			vv.WatchDuration = &v
		}
		views = append(views, &vv)
	}
	return views, nil
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
