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
	BodyPart string `json:"bodyPart"`
	// Equipment is the required equipment (e.g., "barbell", "dumbbell").
	Equipment string `json:"equipment"`
	// Difficulty must be one of: "beginner", "intermediate", "advanced".
	Difficulty string `json:"difficulty"`
	// Category must be one of: "compound", "isolation".
	Category string `json:"category"`
	// Instructions are the step-by-step instructions (newline-separated).
	Instructions string `json:"instructions"`
	// ImageURL is a URL to an image for the exercise.
	ImageURL string `json:"imageUrl,omitempty"`
}

// ExerciseResponse represents an exercise in API responses.
type ExerciseResponse struct {
	ID               string  `json:"id"`
	Slug             string  `json:"slug"`
	Name             string  `json:"name"`
	Description      string  `json:"description,omitempty"`
	Mode             string  `json:"mode"`
	BodyPart         string  `json:"bodyPart,omitempty"`
	MuscleGroups     string  `json:"muscleGroups,omitempty"`
	SecondaryMuscles string  `json:"secondaryMuscles,omitempty"`
	Equipment        string  `json:"equipment,omitempty"`
	Difficulty       string  `json:"difficulty,omitempty"`
	Category         string  `json:"category,omitempty"`
	Instructions     string  `json:"instructions,omitempty"`
	DefaultSec       *int    `json:"defaultSec,omitempty"`
	VideoURL         string  `json:"videoUrl,omitempty"`
	ImageURL         string  `json:"imageUrl,omitempty"`
	IsCustom         bool    `json:"isCustom"`
	CoachID          *string `json:"coachId,omitempty"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

// WorkoutTemplateResponse represents a workout template in API responses.
type WorkoutTemplateResponse struct {
	ID                      string                    `json:"id"`
	CoachID                 string                    `json:"coachId"`
	Name                    string                    `json:"name"`
	Description             string                    `json:"description,omitempty"`
	Goal                    string                    `json:"goal,omitempty"`
	EstimatedDurationMinutes *int                     `json:"estimatedDurationMinutes,omitempty"`
	CreatedAt               string                    `json:"createdAt"`
	UpdatedAt               string                    `json:"updatedAt"`
	Exercises               []WorkoutExerciseResponse `json:"exercises,omitempty"`
}

// WorkoutExerciseResponse represents a workout exercise in API responses.
type WorkoutExerciseResponse struct {
	ID                string  `json:"id"`
	TemplateID        string  `json:"templateId,omitempty"`
	Name              string  `json:"name"`
	Sets              int     `json:"sets"`
	Reps              int     `json:"reps"`
	WeightKg          float64 `json:"weightKg,omitempty"`
	RestSeconds       int     `json:"restSeconds,omitempty"`
	SortOrder         int     `json:"sortOrder"`
	Notes             string  `json:"notes,omitempty"`
	Mode              string  `json:"mode"`
	Phase             string  `json:"phase"`
	SupersetGroup     string  `json:"supersetGroup,omitempty"`
	BodyPart          string  `json:"bodyPart,omitempty"`
	MuscleGroups      string  `json:"muscleGroups,omitempty"`
	ImageURL          string  `json:"imageUrl,omitempty"`
	LibraryExerciseID string  `json:"libraryExerciseId,omitempty"`
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
	EstimatedDurationMinutes *int `json:"estimatedDurationMinutes"`
	// Exercises is the list of exercises in this template.
	Exercises []CreateWorkoutExerciseRequest `json:"exercises"`
}

// CreateWorkoutExerciseRequest is the payload for an exercise within a template.
type CreateWorkoutExerciseRequest struct {
	Name              string  `json:"name"`
	Sets              int     `json:"sets"`
	Reps              int     `json:"reps"`
	WeightKg          float64 `json:"weightKg"`
	RestSeconds       int     `json:"restSeconds"`
	Notes             string  `json:"notes"`
	Mode              string  `json:"mode"`
	Phase             string  `json:"phase"`
	SupersetGroup     string  `json:"supersetGroup"`
	BodyPart          string  `json:"bodyPart"`
	MuscleGroups      string  `json:"muscleGroups"`
	LibraryExerciseID string  `json:"libraryExerciseId"`
}

// AssignWorkoutRequest is the payload for assigning a workout to an athlete.
type AssignWorkoutRequest struct {
	// AthleteID is the athlete to assign the workout to (required).
	AthleteID string `json:"athleteId"`
	// AthleteName is the athlete's display name (optional, resolved if not provided).
	AthleteName string `json:"athleteName"`
	// TemplateID is the workout template to assign (required).
	TemplateID string `json:"templateId"`
	// Modality is the training modality (e.g., "presencial", "online").
	Modality string `json:"modality"`
	// StartDate is the assignment start date (required).
	StartDate string `json:"startDate"`
	// EndDate is the assignment end date (required).
	EndDate string `json:"endDate"`
	// DaysOfWeek is the list of days to perform the workout (0=Sunday, 6=Saturday).
	DaysOfWeek []int `json:"daysOfWeek"`
}

// AssignedWorkoutResponse represents an assigned workout in API responses.
type AssignedWorkoutResponse struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athleteId"`
	AthleteName string  `json:"athleteName,omitempty"`
	ContentID   string  `json:"contentId"`
	ContentType string  `json:"contentType"`
	ContentName string  `json:"contentName"`
	Modality    string  `json:"modality"`
	StartDate   string  `json:"startDate"`
	EndDate     string  `json:"endDate"`
	DaysOfWeek  []int   `json:"daysOfWeek"`
	Status      string  `json:"status"`
	Progress    float64 `json:"progress"`
	CoachID     string  `json:"coachId"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

// WorkoutDetailResponse is the envelope for GET /workouts/:id/detail.
type WorkoutDetailResponse struct {
	Workout   *AssignedWorkoutResponse   `json:"workout"`
	Exercises []WorkoutExerciseResponse `json:"exercises"`
	Session   *WorkoutSessionResponse    `json:"session,omitempty"`
}

// LogWorkoutSetRequest is the payload for logging a completed set.
type LogWorkoutSetRequest struct {
	// AthleteID is the athlete logging the set (required).
	AthleteID string `json:"athleteId"`
	// ExerciseID is the exercise being logged (required).
	ExerciseID string `json:"exerciseId"`
	// SetIndex is the set number (required, 1-based).
	SetIndex int `json:"setIndex"`
	// WeightKg is the weight used in kilograms.
	WeightKg float64 `json:"weightKg"`
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
	SessionID  string  `json:"sessionId"`
	ExerciseID string  `json:"exerciseId"`
	SetIndex   int     `json:"setIndex"`
	WeightKg   float64 `json:"weightKg,omitempty"`
	Reps       float64 `json:"reps,omitempty"`
	Completed  bool    `json:"completed"`
	LoggedAt   string  `json:"loggedAt"`
	Phase      string  `json:"phase,omitempty"`
	RIR        float64 `json:"rir,omitempty"`
	RPE        float64 `json:"rpe,omitempty"`
	Duration   int     `json:"duration,omitempty"`
	Speed      float64 `json:"speed,omitempty"`
	Skipped    bool    `json:"skipped"`
}

// ProgressResponse represents progress data in API responses.
type ProgressResponse struct {
	AthleteID        string  `json:"athleteId"`
	Date             string  `json:"date"`
	WorkoutsAssigned int     `json:"workoutsAssigned"`
	WorkoutsCompleted int    `json:"workoutsCompleted"`
	TotalSets        int     `json:"totalSets"`
	CompletedSets    int     `json:"completedSets"`
	AverageWeight    float64 `json:"averageWeight"`
	TotalVolume      float64 `json:"totalVolume"`
	CompletionRate   float64 `json:"completionRate"`
}

// TrainingSessionResponse represents a training session in API responses.
type TrainingSessionResponse struct {
	ID          string `json:"id"`
	CoachID     string `json:"coachId"`
	AthleteID   string `json:"athleteId"`
	Title       string `json:"title"`
	ScheduledAt string `json:"scheduledAt"`
	EndAt       string `json:"endAt,omitempty"`
	Location    string `json:"location,omitempty"`
	Status      string `json:"status"`
	Notes       string `json:"notes,omitempty"`
}

// WorkoutSessionResponse represents a workout session in API responses.
type WorkoutSessionResponse struct {
	ID                   string `json:"id"`
	WorkoutID            string `json:"workoutId"`
	AthleteID            string `json:"athleteId"`
	StartedAt            string `json:"startedAt"`
	Completed            bool   `json:"completed"`
	CompletedAt          string `json:"completedAt,omitempty"`
	CurrentExerciseIndex int    `json:"currentExerciseIndex"`
	DurationSeconds      int    `json:"durationSeconds"`
}

// CompleteSessionRequest is the payload for completing a workout session.
type CompleteSessionRequest struct {
	// DurationSeconds is the total workout duration in seconds.
	DurationSeconds int `json:"durationSeconds"`
}
