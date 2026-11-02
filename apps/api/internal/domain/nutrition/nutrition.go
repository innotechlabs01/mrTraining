package nutrition

// FoodEntry is a single food item within a meal log.
type FoodEntry struct {
	FoodName  string  `json:"foodName"`
	Serving   string  `json:"serving"`
	Servings  float64 `json:"servings"`
	Calories  float64 `json:"calories"`
	ProteinG  float64 `json:"proteinG"`
	CarbsG    float64 `json:"carbsG"`
	FatG      float64 `json:"fatG"`
}

// MealLog represents a logged meal with macros and food items.
type MealLog struct {
	ID        string       `json:"id"`
	AthleteID string       `json:"athlete_id"`
	MealType  string       `json:"mealType"`
	Foods     []FoodEntry  `json:"foods"`
	Macros    map[string]float64 `json:"macros"`
	LoggedAt  string       `json:"loggedAt"`
}
