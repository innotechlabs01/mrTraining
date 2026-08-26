package training

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
)

// ProgressRepository implements training.ProgressRepository using database/sql with Turso/libsql.
type ProgressRepository struct {
	db *sql.DB
}

// NewProgressRepository creates a new progress repository with the given database connection.
func NewProgressRepository(db *sql.DB) *ProgressRepository {
	return &ProgressRepository{db: db}
}

// GetProgress retrieves progress entries for an athlete within a date range.
// Progress is derived from completed workout sessions and their set logs.
func (r *ProgressRepository) GetProgress(ctx context.Context, athleteID string, dateRange training.ProgressDateRange) ([]*training.ProgressEntry, error) {
	// Query workout sessions grouped by date
	rows, err := r.db.QueryContext(ctx,
		`SELECT
		 DATE(wsl.started_at) AS date,
		 COUNT(DISTINCT wsl.workout_id) AS workouts_assigned,
		 SUM(CASE WHEN wsl.completed = 1 THEN 1 ELSE 0 END) AS workouts_completed,
		 COUNT(wset.id) AS total_sets,
		 SUM(CASE WHEN wset.completed = 1 THEN 1 ELSE 0 END) AS completed_sets,
		 AVG(wset.weight_kg) AS avg_weight,
		 COALESCE(SUM(wset.weight_kg * wset.reps), 0) AS total_volume
		 FROM workout_session_logs wsl
		 LEFT JOIN workout_set_logs wset ON wset.session_id = wsl.id
		 WHERE wsl.athlete_id = ?
		 AND DATE(wsl.started_at) BETWEEN ? AND ?
		 GROUP BY DATE(wsl.started_at)
		 ORDER BY date DESC`,
		athleteID, dateRange.StartDate, dateRange.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query progress: %w", err)
	}
	defer rows.Close()

	var entries []*training.ProgressEntry
	for rows.Next() {
		e := &training.ProgressEntry{}
		var avgWeight sql.NullFloat64
		var totalVolume sql.NullFloat64
		var completedSets sql.NullInt64

		if err := rows.Scan(&e.Date, &e.WorkoutsAssigned, &e.WorkoutsCompleted,
			&e.TotalSets, &completedSets, &avgWeight, &totalVolume); err != nil {
			return nil, fmt.Errorf("failed to scan progress entry: %w", err)
		}

		e.AthleteID = athleteID
		if avgWeight.Valid {
			e.AverageWeight = avgWeight.Float64
		}
		if totalVolume.Valid {
			e.TotalVolume = totalVolume.Float64
		}
		if completedSets.Valid {
			e.CompletedSets = int(completedSets.Int64)
		}

		// Calculate completion rate
		if e.TotalSets > 0 {
			e.CompletionRate = float64(e.CompletedSets) / float64(e.TotalSets) * 100
		}

		entries = append(entries, e)
	}
	return entries, nil
}
