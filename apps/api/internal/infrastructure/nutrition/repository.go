package nutrition

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/nutrition"
)

// Repository implements nutrition.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new nutrition repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateMealLog inserts a new meal log entry.
func (r *Repository) CreateMealLog(ctx context.Context, log *nutrition.MealLog) error {
	if r.db == nil {
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

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO nutrition_meal_logs (id, athlete_id, meal_type, foods, macros, logged_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, log.ID, log.AthleteID, log.MealType, foodsJSON, macrosJSON, log.LoggedAt)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to create meal log: %w", err)
	}
	return nil
}

// ListMealLogs returns all meal logs for an athlete.
func (r *Repository) ListMealLogs(ctx context.Context, athleteID string) ([]*nutrition.MealLog, error) {
	if r.db == nil {
		return []*nutrition.MealLog{}, nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, meal_type, foods, macros, logged_at
		FROM nutrition_meal_logs
		WHERE athlete_id = $1
		ORDER BY logged_at DESC
	`, athleteID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*nutrition.MealLog{}, nil
		}
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
