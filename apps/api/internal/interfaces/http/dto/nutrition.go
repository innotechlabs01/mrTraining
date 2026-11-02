package dto

import (
	"github.com/innotechlabs01/mr-training-api/internal/domain/nutrition"
)

// CreateMealLogRequest is the payload for creating a meal log.
type CreateMealLogRequest struct {
	MealType string                      `json:"mealType"`
	Foods    []nutrition.FoodEntry       `json:"foods"`
	Macros   map[string]float64          `json:"macros"`
}

// MealLogResponse represents a meal log in API responses.
type MealLogResponse struct {
	ID        string             `json:"id"`
	AthleteID string             `json:"athleteId"`
	MealType  string             `json:"mealType"`
	Foods     []nutrition.FoodEntry `json:"foods"`
	Macros    map[string]float64 `json:"macros"`
	LoggedAt  string             `json:"loggedAt"`
}

// ListMealLogsResponse is a list of meal logs.
type ListMealLogsResponse struct {
	Data  []MealLogResponse `json:"data"`
	Total int               `json:"total"`
}

// DailyMacrosResponse holds aggregated macronutrient totals for a day.
type DailyMacrosResponse struct {
	Date     string  `json:"date"`
	Protein  float64 `json:"protein"`
	Carbs    float64 `json:"carbs"`
	Fat      float64 `json:"fat"`
	Calories float64 `json:"calories"`
}
