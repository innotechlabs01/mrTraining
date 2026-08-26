// Package exercise defines the core exercise domain entities for the MR Training API.
// It includes ExerciseEntry types that map to the exercise_library database table.
package exercise

// ExerciseEntry represents a single exercise in the shared exercise catalog.
// Global entries (CoachID is nil) are visible to every coach.
// Custom entries (CoachID set) are scoped to their owning coach.
type ExerciseEntry struct {
	ID               string  `json:"id"`
	Slug             string  `json:"slug"`
	Name             string  `json:"name"`
	Description      string  `json:"description,omitempty"`
	Mode             string  `json:"mode"` // "reps", "time", "cardio"
	BodyPart         string  `json:"body_part,omitempty"`
	MuscleGroups     string  `json:"muscle_groups,omitempty"`
	SecondaryMuscles string  `json:"secondary_muscles,omitempty"`
	Equipment        string  `json:"equipment,omitempty"`
	Difficulty       string  `json:"difficulty,omitempty"` // "beginner", "intermediate", "advanced"
	Category         string  `json:"category,omitempty"`  // "compound", "isolation"
	Instructions     string  `json:"instructions,omitempty"`
	DefaultSec       *int    `json:"default_sec,omitempty"`
	VideoURL         string  `json:"video_url,omitempty"`
	IsCustom         bool    `json:"is_custom"`
	CoachID          *string `json:"coach_id,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}
