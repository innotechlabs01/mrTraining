// Package trainingai defines the AI-insights contract for workout detail:
// per-exercise load suggestions, 1RM estimates, plateau detection and fatigue.
package trainingai

import "context"

// WorkoutExercise is the minimal prescription data needed to build insights.
type WorkoutExercise struct {
	ID          string
	Name        string
	Sets        int
	Reps        int
	WeightKg    float64
	RestSeconds int
}

// SetHistoryEntry is the best completed set of one exercise on one date.
type SetHistoryEntry struct {
	Date   string
	Weight float64
	Reps   float64
}

// ExerciseInsight is the AI suggestion for a single exercise of a workout.
type ExerciseInsight struct {
	ExerciseID      string  `json:"exercise_id"`
	Name            string  `json:"name"`
	PrescribedSets  int     `json:"prescribed_sets"`
	PrescribedReps  int     `json:"prescribed_reps"`
	SuggestedWeight float64 `json:"suggested_weight_kg"`
	SuggestedReps   int     `json:"suggested_reps"`
	TargetRIR       int     `json:"target_rir"`
	OneRM           float64 `json:"one_rm_kg"`
	Plateau         bool    `json:"plateau"`
	FatigueScore    float64 `json:"fatigue_score"`
	Confidence      float64 `json:"confidence"`
	Reason          string  `json:"reason"`
}

// WorkoutInsights is the full AI payload for a workout detail screen.
type WorkoutInsights struct {
	WorkoutID   string            `json:"workout_id"`
	Exercises   []ExerciseInsight `json:"exercises"`
	GeneratedAt string            `json:"generated_at"`
}

// Repository provides the data the insight rules need.
type Repository interface {
	// GetWorkoutAthlete returns the athlete the workout is assigned to.
	GetWorkoutAthlete(ctx context.Context, workoutID string) (string, error)

	// GetWorkoutExercises returns the prescribed exercises of a workout.
	GetWorkoutExercises(ctx context.Context, workoutID string) ([]WorkoutExercise, error)

	// GetExerciseHistory returns the last `limit` dated best sets for an
	// athlete and exercise name (name match across assigned workouts), newest first.
	GetExerciseHistory(ctx context.Context, athleteID, exerciseName string, limit int) ([]SetHistoryEntry, error)

	// GetExerciseLoadByDay returns load (weight*reps) per date for the last 7
	// days of an exercise.
	GetExerciseLoadByDay(ctx context.Context, athleteID, exerciseName string) (map[string]float64, error)
}
