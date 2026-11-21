package nutrition

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/nutrition"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements nutrition.Repository using database/sql.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new nutrition repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) nutrition.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// CreateMealLog inserts a new meal log entry.
func (r *Repository) CreateMealLog(ctx context.Context, log *nutrition.MealLog) error {
	if r.exec == nil {
		return fmt.Errorf("database not configured")
	}

	foodsJSON, err := marshalJSON(log.Foods)
	if err != nil {
		return fmt.Errorf("marshal foods: %w", err)
	}

	macrosJSON, err := marshalJSON(log.Macros)
	if err != nil {
		return fmt.Errorf("marshal macros: %w", err)
	}

	_, err = r.exec.ExecContext(ctx, `
		INSERT INTO nutrition_meal_logs (id, athlete_id, meal_type, foods, macros, logged_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, log.ID, log.AthleteID, log.MealType, foodsJSON, macrosJSON, log.LoggedAt)
	if err != nil {
		return fmt.Errorf("failed to create meal log: %w", err)
	}
	return nil
}

// ListMealLogs returns all meal logs for an athlete.
func (r *Repository) ListMealLogs(ctx context.Context, athleteID string) ([]*nutrition.MealLog, error) {
	if r.exec == nil {
		return []*nutrition.MealLog{}, nil
	}

	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, meal_type, foods, macros, logged_at::text
		FROM nutrition_meal_logs
		WHERE athlete_id = $1
		ORDER BY logged_at DESC
	`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list meal logs: %w", err)
	}
	defer rows.Close()

	var logs []*nutrition.MealLog
	for rows.Next() {
		var l nutrition.MealLog
		var foodsJSON, macrosJSON string
		if err := rows.Scan(&l.ID, &l.AthleteID, &l.MealType, &foodsJSON, &macrosJSON, &l.LoggedAt); err != nil {
			return nil, fmt.Errorf("failed to scan meal log: %w", err)
		}
		l.Foods = unmarshalFoods(foodsJSON)
		l.Macros = unmarshalMacros(macrosJSON)
		logs = append(logs, &l)
	}
	if logs == nil {
		logs = []*nutrition.MealLog{}
	}
	return logs, nil
}

func marshalJSON(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func unmarshalFoods(jsonStr string) []nutrition.FoodEntry {
	if jsonStr == "" || jsonStr == "[]" {
		return []nutrition.FoodEntry{}
	}
	var foods []nutrition.FoodEntry
	if err := json.Unmarshal([]byte(jsonStr), &foods); err != nil {
		return []nutrition.FoodEntry{}
	}
	return foods
}

func unmarshalMacros(jsonStr string) map[string]float64 {
	if jsonStr == "" || jsonStr == "{}" {
		return map[string]float64{}
	}
	var macros map[string]float64
	if err := json.Unmarshal([]byte(jsonStr), &macros); err != nil {
		return map[string]float64{}
	}
	return macros
}
