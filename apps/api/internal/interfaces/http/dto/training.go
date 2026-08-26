package dto

// CreateExerciseRequest is the payload for creating a new custom exercise.
type CreateExerciseRequest struct {
	// Name is the exercise name (required, 1-200 characters).
	Name string `json:"name"`
	// Description is a brief description of the exercise.
	Description string `json:"description"`
	// Mode must be one of: "reps", "time", "cardio".
	Mode string `json:"mode"`
	// BodyPart is the primary body part (e.g., "legs", "chest").
	BodyPart string `json:"body_part"`
	// Equipment is the required equipment (e.g., "barbell", "dumbbell").
	Equipment string `json:"equipment"`
	// Difficulty must be one of: "beginner", "intermediate", "advanced".
	Difficulty string `json:"difficulty"`
	// Category must be one of: "compound", "isolation".
	Category string `json:"category"`
	// Instructions are the step-by-step instructions (newline-separated).
	Instructions string `json:"instructions"`
}

// ExerciseResponse represents an exercise in API responses.
type ExerciseResponse struct {
	ID               string  `json:"id"`
	Slug             string  `json:"slug"`
	Name             string  `json:"name"`
	Description      string  `json:"description,omitempty"`
	Mode             string  `json:"mode"`
	BodyPart         string  `json:"body_part,omitempty"`
	MuscleGroups     string  `json:"muscle_groups,omitempty"`
	SecondaryMuscles string  `json:"secondary_muscles,omitempty"`
	Equipment        string  `json:"equipment,omitempty"`
	Difficulty       string  `json:"difficulty,omitempty"`
	Category         string  `json:"category,omitempty"`
	Instructions     string  `json:"instructions,omitempty"`
	DefaultSec       *int    `json:"default_sec,omitempty"`
	VideoURL         string  `json:"video_url,omitempty"`
	IsCustom         bool    `json:"is_custom"`
	CoachID          *string `json:"coach_id,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}

// WorkoutTemplateResponse represents a workout template in API responses.
type WorkoutTemplateResponse struct {
	ID                      string                    `json:"id"`
	CoachID                 string                    `json:"coach_id"`
	Name                    string                    `json:"name"`
	Description             string                    `json:"description,omitempty"`
	Goal                    string                    `json:"goal,omitempty"`
	EstimatedDurationMinutes *int                     `json:"estimated_duration_minutes,omitempty"`
	CreatedAt               string                    `json:"created_at"`
	UpdatedAt               string                    `json:"updated_at"`
	Exercises               []WorkoutExerciseResponse `json:"exercises,omitempty"`
}

// WorkoutExerciseResponse represents a workout exercise in API responses.
type WorkoutExerciseResponse struct {
	ID                string  `json:"id"`
	TemplateID        string  `json:"template_id,omitempty"`
	Name              string  `json:"name"`
	Sets              int     `json:"sets"`
	Reps              int     `json:"reps"`
	WeightKg          float64 `json:"weight_kg,omitempty"`
	RestSeconds       int     `json:"rest_seconds,omitempty"`
	SortOrder         int     `json:"sort_order"`
	Notes             string  `json:"notes,omitempty"`
	Mode              string  `json:"mode"`
	Phase             string  `json:"phase"`
	SupersetGroup     string  `json:"superset_group,omitempty"`
	BodyPart          string  `json:"body_part,omitempty"`
	MuscleGroups      string  `json:"muscle_groups,omitempty"`
	LibraryExerciseID string  `json:"library_exercise_id,omitempty"`
}

// CreateWorkoutTemplateRequest is the payload for creating a workout template.
type CreateWorkoutTemplateRequest struct {
	// Name is the template name (required, 1-200 characters).
	Name string `json:"name"`
	// Description is a brief description of the template.
	Description string `json:"description"`
	// Goal is the training goal (e.g., "strength", "hypertrophy").
	Goal string `json:"goal"`
	// EstimatedDurationMinutes is the estimated workout duration.
	EstimatedDurationMinutes *int `json:"estimated_duration_minutes"`
	// Exercises is the list of exercises in this template.
	Exercises []CreateWorkoutExerciseRequest `json:"exercises"`
}

// CreateWorkoutExerciseRequest is the payload for an exercise within a template.
type CreateWorkoutExerciseRequest struct {
	Name              string  `json:"name"`
	Sets              int     `json:"sets"`
	Reps              int     `json:"reps"`
	WeightKg          float64 `json:"weight_kg"`
	RestSeconds       int     `json:"rest_seconds"`
	Notes             string  `json:"notes"`
	Mode              string  `json:"mode"`
	Phase             string  `json:"phase"`
	SupersetGroup     string  `json:"superset_group"`
	BodyPart          string  `json:"body_part"`
	MuscleGroups      string  `json:"muscle_groups"`
	LibraryExerciseID string  `json:"library_exercise_id"`
}

// AssignWorkoutRequest is the payload for assigning a workout to an athlete.
type AssignWorkoutRequest struct {
	// AthleteID is the athlete to assign the workout to (required).
	AthleteID string `json:"athlete_id"`
	// AthleteName is the athlete's display name (optional, resolved if not provided).
	AthleteName string `json:"athlete_name"`
	// TemplateID is the workout template to assign (required).
	TemplateID string `json:"template_id"`
	// Modality is the training modality (e.g., "presencial", "online").
	Modality string `json:"modality"`
	// StartDate is the assignment start date (required).
	StartDate string `json:"start_date"`
	// EndDate is the assignment end date (required).
	EndDate string `json:"end_date"`
	// DaysOfWeek is the list of days to perform the workout (0=Sunday, 6=Saturday).
	DaysOfWeek []int `json:"days_of_week"`
}

// AssignedWorkoutResponse represents an assigned workout in API responses.
type AssignedWorkoutResponse struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	AthleteName string  `json:"athlete_name,omitempty"`
	ContentID   string  `json:"content_id"`
	ContentType string  `json:"content_type"`
	ContentName string  `json:"content_name"`
	Modality    string  `json:"modality"`
	StartDate   string  `json:"start_date"`
	EndDate     string  `json:"end_date"`
	DaysOfWeek  []int   `json:"days_of_week"`
	Status      string  `json:"status"`
	Progress    float64 `json:"progress"`
	CoachID     string  `json:"coach_id"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// LogWorkoutSetRequest is the payload for logging a completed set.
type LogWorkoutSetRequest struct {
	// AthleteID is the athlete logging the set (required).
	AthleteID string `json:"athlete_id"`
	// ExerciseID is the exercise being logged (required).
	ExerciseID string `json:"exercise_id"`
	// SetIndex is the set number (required, 1-based).
	SetIndex int `json:"set_index"`
	// WeightKg is the weight used in kilograms.
	WeightKg float64 `json:"weight_kg"`
	// Reps is the number of repetitions completed.
	Reps float64 `json:"reps"`
	// Phase is the set phase ("work" or "warmup").
	Phase string `json:"phase"`
	// RIR is reps in reserve (0-10).
	RIR float64 `json:"rir"`
	// RPE is rating of perceived exertion (6-10).
	RPE float64 `json:"rpe"`
	// Duration is the held seconds (for time mode).
	Duration int `json:"duration"`
	// Speed is the speed (for cardio mode).
	Speed float64 `json:"speed"`
	// Skipped indicates if the set was skipped.
	Skipped bool `json:"skipped"`
}

// WorkoutSetResponse represents a logged set in API responses.
type WorkoutSetResponse struct {
	ID         string  `json:"id"`
	SessionID  string  `json:"session_id"`
	ExerciseID string  `json:"exercise_id"`
	SetIndex   int     `json:"set_index"`
	WeightKg   float64 `json:"weight_kg,omitempty"`
	Reps       float64 `json:"reps,omitempty"`
	Completed  bool    `json:"completed"`
	LoggedAt   string  `json:"logged_at"`
	Phase      string  `json:"phase,omitempty"`
	RIR        float64 `json:"rir,omitempty"`
	RPE        float64 `json:"rpe,omitempty"`
	Duration   int     `json:"duration,omitempty"`
	Speed      float64 `json:"speed,omitempty"`
	Skipped    bool    `json:"skipped"`
}

// ProgressResponse represents progress data in API responses.
type ProgressResponse struct {
	AthleteID        string  `json:"athlete_id"`
	Date             string  `json:"date"`
	WorkoutsAssigned int     `json:"workouts_assigned"`
	WorkoutsCompleted int    `json:"workouts_completed"`
	TotalSets        int     `json:"total_sets"`
	CompletedSets    int     `json:"completed_sets"`
	AverageWeight    float64 `json:"average_weight"`
	TotalVolume      float64 `json:"total_volume"`
	CompletionRate   float64 `json:"completion_rate"`
}
