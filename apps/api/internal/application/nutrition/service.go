// Package nutrition provides application services for the nutrition domain.
package nutrition

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/nutrition"
)

// Service handles nutrition business logic.
type Service struct {
	repo nutrition.Repository
}

// NewService creates a new nutrition service.
func NewService(repo nutrition.Repository) *Service {
	return &Service{repo: repo}
}

// CreateMealLog creates a new meal log entry for an athlete.
func (s *Service) CreateMealLog(ctx context.Context, athleteID string, req CreateMealLogRequest) (*nutrition.MealLog, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if strings.TrimSpace(req.MealType) == "" {
		return nil, fmt.Errorf("meal type is required")
	}

	log := &nutrition.MealLog{
		ID:        uuid.New().String(),
		AthleteID: athleteID,
		MealType:  req.MealType,
		Foods:     req.Foods,
		Macros:    req.Macros,
		LoggedAt:  time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.repo.CreateMealLog(ctx, log); err != nil {
		return nil, fmt.Errorf("create meal log: %w", err)
	}

	return log, nil
}

// ListMealLogs returns all meal logs for an athlete within an optional date range.
func (s *Service) ListMealLogs(ctx context.Context, athleteID string, from, to string) ([]*nutrition.MealLog, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}

	logs, err := s.repo.ListMealLogs(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("list meal logs: %w", err)
	}

	if logs == nil {
		logs = []*nutrition.MealLog{}
	}

	// Filter by date range if provided
	if from != "" || to != "" {
		filtered := make([]*nutrition.MealLog, 0, len(logs))
		for _, l := range logs {
			if (from == "" || l.LoggedAt >= from) && (to == "" || l.LoggedAt <= to) {
				filtered = append(filtered, l)
			}
		}
		logs = filtered
	}

	return logs, nil
}

// GetDailyMacros returns aggregated macros for an athlete on a given date.
func (s *Service) GetDailyMacros(ctx context.Context, athleteID, date string) (*DailyMacros, error) {
	logs, err := s.ListMealLogs(ctx, athleteID, date, date)
	if err != nil {
		return nil, err
	}

	macros := &DailyMacros{Date: date}
	for _, l := range logs {
		for food, amount := range l.Macros {
			switch food {
			case "protein":
				macros.Protein += amount
			case "carbs":
				macros.Carbs += amount
			case "fat":
				macros.Fat += amount
			case "calories":
				macros.Calories += amount
			}
		}
	}

	return macros, nil
}

// DailyMacros holds aggregated macronutrient totals for a single day.
type DailyMacros struct {
	Date     string  `json:"date"`
	Protein  float64 `json:"protein"`
	Carbs    float64 `json:"carbs"`
	Fat      float64 `json:"fat"`
	Calories float64 `json:"calories"`
}

// CreateMealLogRequest is the payload for creating a meal log.
type CreateMealLogRequest struct {
	MealType string                      `json:"mealType"`
	Foods    []nutrition.FoodEntry       `json:"foods"`
	Macros   map[string]float64          `json:"macros"`
}
