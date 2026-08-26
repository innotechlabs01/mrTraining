// Package training defines the core training domain entities for the MR Training API.
// It includes ExerciseEntry, WorkoutTemplate, AssignedWorkout, WorkoutSession,
// and WorkoutSet types that map to the exercise and workout database tables.
package training

import "errors"

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("resource not found")

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

// ExerciseFilter holds optional filters for listing exercises.
type ExerciseFilter struct {
	// BodyPart filters by body part (e.g., "legs", "chest").
	BodyPart string
	// Equipment filters by equipment type (e.g., "barbell", "dumbbell").
	Equipment string
	// Difficulty filters by difficulty level (e.g., "beginner").
	Difficulty string
	// Search filters by name or description (partial match).
	Search string
	// CoachID scopes to global + coach's custom exercises.
	// If empty, only global exercises are returned.
	CoachID string
}
