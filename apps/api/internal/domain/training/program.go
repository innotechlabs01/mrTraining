package training

// Program is a coach-authored, ordered collection of workout templates that
// forms a multi-week training plan. Assigning a program to an athlete expands
// it into the athlete's individual assigned workouts.
type Program struct {
	ID              string           `json:"id"`
	CoachID         string           `json:"coach_id"`
	Name            string           `json:"name"`
	Description     string           `json:"description,omitempty"`
	Goal            string           `json:"goal,omitempty"`
	DifficultyLevel string           `json:"difficulty_level,omitempty"`
	DurationWeeks   int              `json:"duration_weeks"`
	WorkoutCount    int              `json:"workout_count,omitempty"`
	Workouts        []ProgramWorkout `json:"workouts,omitempty"`
	CreatedAt       string           `json:"created_at"`
	UpdatedAt       string           `json:"updated_at"`
}

// ProgramWorkout is a single workout template slot inside a program, ordered
// by OrderIndex within the program sequence.
type ProgramWorkout struct {
	TemplateID string `json:"template_id"`
	Name       string `json:"name,omitempty"`
	OrderIndex int    `json:"order_index"`
}