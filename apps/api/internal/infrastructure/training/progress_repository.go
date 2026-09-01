package training

import (
	"context"
	"database/sql"
	"fmt"
	"time"

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

// GetProgressSummary retrieves aggregated progress metrics for an athlete within a date range,
// including a consecutive-day completion streak ending at the range's EndDate.
func (r *ProgressRepository) GetProgressSummary(ctx context.Context, athleteID string, dateRange training.ProgressDateRange) (*training.ProgressSummary, error) {
	var workoutsCompleted int
	var totalSets int
	var completedSets int
	var totalVolume float64

	err := r.db.QueryRowContext(ctx,
		`SELECT
		 COALESCE(SUM(CASE WHEN wsl.completed = 1 THEN 1 ELSE 0 END), 0) AS workouts_completed,
		 COUNT(wset.id) AS total_sets,
		 COALESCE(SUM(CASE WHEN wset.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_sets,
		 COALESCE(SUM(wset.weight_kg * wset.reps), 0) AS total_volume
		 FROM workout_session_logs wsl
		 LEFT JOIN workout_set_logs wset ON wset.session_id = wsl.id
		 WHERE wsl.athlete_id = ?
		 AND DATE(wsl.started_at) BETWEEN ? AND ?`,
		athleteID, dateRange.StartDate, dateRange.EndDate).Scan(&workoutsCompleted, &totalSets, &completedSets, &totalVolume)
	if err != nil {
		return nil, fmt.Errorf("failed to query progress summary: %w", err)
	}

	summary := &training.ProgressSummary{
		AthleteID:         athleteID,
		StartDate:         dateRange.StartDate,
		EndDate:           dateRange.EndDate,
		WorkoutsCompleted: workoutsCompleted,
		TotalVolume:       totalVolume,
	}
	if totalSets > 0 {
		summary.AvgCompletionRate = float64(completedSets) / float64(totalSets) * 100
	}

	streak, err := r.countCompletionStreak(ctx, athleteID, dateRange)
	if err != nil {
		return nil, err
	}
	summary.Streak = streak

	return summary, nil
}

// countCompletionStreak counts consecutive days ending at dateRange.EndDate
// on which the athlete completed at least one workout session.
func (r *ProgressRepository) countCompletionStreak(ctx context.Context, athleteID string, dateRange training.ProgressDateRange) (int, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT DISTINCT DATE(wsl.started_at) AS date
		 FROM workout_session_logs wsl
		 WHERE wsl.athlete_id = ?
		 AND wsl.completed = 1
		 AND DATE(wsl.started_at) BETWEEN ? AND ?
		 ORDER BY date DESC`,
		athleteID, dateRange.StartDate, dateRange.EndDate)
	if err != nil {
		return 0, fmt.Errorf("failed to query completion dates: %w", err)
	}
	defer rows.Close()

	completedDates := make(map[string]struct{})
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return 0, fmt.Errorf("failed to scan completion date: %w", err)
		}
		completedDates[d] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("iterate completion dates: %w", err)
	}

	if dateRange.EndDate == "" {
		return 0, nil
	}

	streak := 0
	cur, err := time.Parse("2006-01-02", dateRange.EndDate)
	if err != nil {
		// Fall back to zero if the end date is not a valid calendar date.
		return 0, nil
	}

	for {
		dayStr := cur.Format("2006-01-02")
		if _, ok := completedDates[dayStr]; !ok {
			break
		}
		streak++
		if dayStr <= dateRange.StartDate {
			break
		}
		cur = cur.AddDate(0, 0, -1)
	}

	return streak, nil
}
