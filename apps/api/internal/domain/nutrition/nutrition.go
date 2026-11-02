package nutrition

type MealLog struct {
	ID string `json:"id"`
	AthleteID string `json:"athlete_id"`
	Macros map[string]float64 `json:"macros"`
}
