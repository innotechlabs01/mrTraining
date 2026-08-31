// Package workout defines the core workout domain entities for the MR Training API.
// It includes WorkoutTemplate and WorkoutTemplateExercise types that map to the database schema.
package workout

import "github.com/google/uuid"

// NewWorkoutTemplate creates a new WorkoutTemplate aggregate with generated ID.
func NewWorkoutTemplate(coachID, name string) *WorkoutTemplate {
	return &WorkoutTemplate{
		ID:      uuid.New().String(),
		CoachID: coachID,
		Name:    name,
	}
}

// WorkoutTemplate represents a coach-designed workout plan that can be
// assigned to multiple athletes. Templates contain metadata and a list
// of exercises.
type WorkoutTemplate struct {
	ID                     string    `json:"id"`
	CoachID                string    `json:"coach_id"`
	Name                   string    `json:"name"`
	Description            string    `json:"description,omitempty"`
	Goal                   string    `json:"goal,omitempty"`
	EstimatedDurationMinutes *int    `json:"estimated_duration_minutes,omitempty"`
	CreatedAt              string    `json:"created_at"`
	UpdatedAt              string    `json:"updated_at"`
	Exercises              []Exercise `json:"exercises,omitempty"`
}

// Exercise represents a single exercise within a workout template.
// It stores the exercise configuration including sets, reps, and progression.
type Exercise struct {
	ID               string  `json:"id"`
	TemplateID       string  `json:"template_id"`
	Name             string  `json:"name"`
	Sets             int     `json:"sets"`
	Reps             int     `json:"reps"`
	WeightKg         float64 `json:"weight_kg,omitempty"`
	RestSeconds      int     `json:"rest_seconds,omitempty"`
	SortOrder        int     `json:"sort_order"`
	Notes            string  `json:"notes,omitempty"`
	Mode             string  `json:"mode"` // "reps", "time", "cardio"
	Phase            string  `json:"phase"` // "work", "rest", "warmup", "cooldown"
	SupersetGroup    string  `json:"superset_group,omitempty"`
	RepsMin          *int    `json:"reps_min,omitempty"`
	RepsMax          *int    `json:"reps_max,omitempty"`
	Progression      string  `json:"progression,omitempty"`
	Increment        float64 `json:"increment,omitempty"`
	DurationSeconds  int     `json:"duration_seconds,omitempty"`
	DurationMinutes  float64 `json:"duration_minutes,omitempty"`
	Speed            float64 `json:"speed,omitempty"`
	PerSide          bool    `json:"per_side"`
	BodyPart         string  `json:"body_part,omitempty"`
	MuscleGroups     string  `json:"muscle_groups,omitempty"`
	LibraryExerciseID string `json:"library_exercise_id,omitempty"`
}
