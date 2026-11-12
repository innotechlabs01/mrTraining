package formmetrics

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/formmetrics"
)

// Repository implements the formmetrics.Repository interface.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new form metrics repository.
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
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
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

func (r *Repository) InsertBatch(ctx context.Context, metrics []*domain.FormMetric) error {
	if r.exec == nil || len(metrics) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO form_metrics (id, athlete_id, exercise_id, exercise_name, workout_id, form_score, depth, alignment, tempo, recorded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`)
	if err != nil {
		return fmt.Errorf("prepare: %w", err)
	}
	defer stmt.Close()

	for _, m := range metrics {
		if _, err := stmt.ExecContext(ctx, m.ID, m.AthleteID, m.ExerciseID, m.ExerciseName,
			m.WorkoutID, m.FormScore, m.Depth, m.Alignment, m.Tempo, m.RecordedAt); err != nil {
			return fmt.Errorf("insert metric: %w", err)
		}
	}

	return tx.Commit()
}

func (r *Repository) GetByAthlete(ctx context.Context, athleteID string) ([]*domain.ExerciseFormStats, error) {
	if r.exec == nil {
		return nil, nil
	}

	rows, err := r.exec.QueryContext(ctx, `
		SELECT
			exercise_id,
			exercise_name,
			form_score,
			depth,
			alignment,
			tempo,
			recorded_at
		FROM form_metrics
		WHERE athlete_id = $1
		ORDER BY recorded_at DESC
	`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	// Group by exercise
	exerciseMap := make(map[string]*domain.ExerciseFormStats)
	var exerciseOrder []string

	for rows.Next() {
		var exID, exName string
		var score, depth, alignment, tempo float64
		var recordedAt string

		if err := rows.Scan(&exID, &exName, &score, &depth, &alignment, &tempo, &recordedAt); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		stats, exists := exerciseMap[exID]
		if !exists {
			stats = &domain.ExerciseFormStats{
				ExerciseID:   exID,
				ExerciseName: exName,
				History:      []domain.HistoryEntry{},
			}
			exerciseMap[exID] = stats
			exerciseOrder = append(exerciseOrder, exID)
		}

		// Track scores for stats
		stats.Sessions++
		stats.History = append(stats.History, domain.HistoryEntry{Date: recordedAt, Score: score})

		// Update running stats
		if stats.Sessions == 1 {
			stats.LatestScore = score
			stats.BestScore = score
			stats.WorstScore = score
			stats.AvgScore = score
			stats.AvgDepth = depth
			stats.AvgAlignment = alignment
			stats.AvgTempo = tempo
		} else {
			// Latest is first (ORDER BY recorded_at DESC)
			stats.BestScore = max(stats.BestScore, score)
			stats.WorstScore = min(stats.WorstScore, score)
			// Running average
			n := float64(stats.Sessions)
			stats.AvgScore = (stats.AvgScore*(n-1) + score) / n
			stats.AvgDepth = (stats.AvgDepth*(n-1) + depth) / n
			stats.AvgAlignment = (stats.AvgAlignment*(n-1) + alignment) / n
			stats.AvgTempo = (stats.AvgTempo*(n-1) + tempo) / n
		}
	}

	// Calculate trends
	result := make([]*domain.ExerciseFormStats, 0, len(exerciseOrder))
	for _, exID := range exerciseOrder {
		stats := exerciseMap[exID]
		stats.Trend = calculateTrend(stats.History)
		stats.AvgScore = round(stats.AvgScore)
		stats.AvgDepth = round(stats.AvgDepth)
		stats.AvgAlignment = round(stats.AvgAlignment)
		stats.AvgTempo = round(stats.AvgTempo)
		result = append(result, stats)
	}

	return result, nil
}

func (r *Repository) GetByAthleteAndExercise(ctx context.Context, athleteID string, exerciseID string) ([]*domain.FormMetric, error) {
	if r.exec == nil {
		return nil, nil
	}

	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, exercise_id, exercise_name, workout_id, form_score, depth, alignment, tempo, recorded_at
		FROM form_metrics
		WHERE athlete_id = $1 AND exercise_id = $2
		ORDER BY recorded_at DESC
	`, athleteID, exerciseID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var metrics []*domain.FormMetric
	for rows.Next() {
		m := &domain.FormMetric{}
		if err := rows.Scan(&m.ID, &m.AthleteID, &m.ExerciseID, &m.ExerciseName, &m.WorkoutID,
			&m.FormScore, &m.Depth, &m.Alignment, &m.Tempo, &m.RecordedAt); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		metrics = append(metrics, m)
	}
	return metrics, nil
}

func (r *Repository) GetByCoach(ctx context.Context, coachID string) ([]*domain.CoachAthleteFormStats, error) {
	if r.exec == nil {
		return nil, nil
	}

	rows, err := r.exec.QueryContext(ctx, `
		SELECT
			fm.athlete_id,
			COALESCE(ca.name, 'Athlete') as athlete_name,
			fm.exercise_id,
			fm.exercise_name,
			fm.form_score,
			fm.depth,
			fm.alignment,
			fm.tempo,
			fm.recorded_at
		FROM form_metrics fm
		LEFT JOIN coach_athletes ca ON fm.athlete_id = ca.id AND ca.coach_id = $1
		WHERE ca.id IS NOT NULL
		ORDER BY fm.recorded_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	// Group by athlete+exercise
	type aggKey struct {
		athleteID  string
		exerciseID string
	}
	groups := make(map[aggKey]*domain.CoachAthleteFormStats)
	var order []aggKey

	for rows.Next() {
		var athleteID, athleteName, exID, exName string
		var score, depth, alignment, tempo float64
		var recordedAt string

		if err := rows.Scan(&athleteID, &athleteName, &exID, &exName, &score,
			&depth, &alignment, &tempo, &recordedAt); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		key := aggKey{athleteID: athleteID, exerciseID: exID}
		stats, exists := groups[key]
		if !exists {
			stats = &domain.CoachAthleteFormStats{
				AthleteID:    athleteID,
				AthleteName:  athleteName,
				ExerciseID:   exID,
				ExerciseName: exName,
			}
			groups[key] = stats
			order = append(order, key)
		}

		stats.Sessions++
		if stats.Sessions == 1 {
			stats.LatestScore = score
			stats.BestScore = score
			stats.WorstScore = score
			stats.AvgScore = score
			stats.AvgDepth = depth
			stats.AvgAlignment = alignment
			stats.AvgTempo = tempo
		} else {
			stats.BestScore = max(stats.BestScore, score)
			stats.WorstScore = min(stats.WorstScore, score)
			n := float64(stats.Sessions)
			stats.AvgScore = (stats.AvgScore*(n-1) + score) / n
			stats.AvgDepth = (stats.AvgDepth*(n-1) + depth) / n
			stats.AvgAlignment = (stats.AvgAlignment*(n-1) + alignment) / n
			stats.AvgTempo = (stats.AvgTempo*(n-1) + tempo) / n
		}
	}

	result := make([]*domain.CoachAthleteFormStats, 0, len(order))
	for _, key := range order {
		stats := groups[key]
		stats.Trend = calculateCoachTrend(stats.AthleteID, stats.ExerciseID, r.db, ctx) // placeholder, simplified
		stats.AvgScore = round(stats.AvgScore)
		stats.AvgDepth = round(stats.AvgDepth)
		stats.AvgAlignment = round(stats.AvgAlignment)
		stats.AvgTempo = round(stats.AvgTempo)
		result = append(result, stats)
	}

	return result, nil
}

func calculateCoachTrend(athleteID, exerciseID string, db *sql.DB, ctx context.Context) string {
	// Simplified trend: stable by default for coach aggregate
	return "stable"
}

// calculateTrend determines if scores are improving, declining, or stable.
func calculateTrend(history []domain.HistoryEntry) string {
	if len(history) < 4 {
		return "stable"
	}

	mid := len(history) / 2
	// History is newest-first, so first half = recent, second half = older
	recentSum := 0.0
	for i := 0; i < mid; i++ {
		recentSum += history[i].Score
	}
	olderSum := 0.0
	for i := mid; i < len(history); i++ {
		olderSum += history[i].Score
	}

	recentAvg := recentSum / float64(mid)
	olderAvg := olderSum / float64(len(history)-mid)

	if recentAvg > olderAvg+5 {
		return "improving"
	}
	if olderAvg > recentAvg+5 {
		return "declining"
	}
	return "stable"
}

func round(v float64) float64 {
	return float64(int(v*10)) / 10
}
