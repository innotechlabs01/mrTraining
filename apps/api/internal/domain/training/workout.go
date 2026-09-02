package training

// WorkoutTemplate represents a coach-designed workout plan that can be
// assigned to multiple athletes. Templates contain metadata and a list
// of exercises.
type WorkoutTemplate struct {
	ID                      string            `json:"id"`
	CoachID                 string            `json:"coach_id"`
	Name                    string            `json:"name"`
	Description             string            `json:"description,omitempty"`
	Goal                    string            `json:"goal,omitempty"`
	EstimatedDurationMinutes *int             `json:"estimated_duration_minutes,omitempty"`
	CreatedAt               string            `json:"created_at"`
	UpdatedAt               string            `json:"updated_at"`
	Exercises               []WorkoutExercise `json:"exercises,omitempty"`
}

// WorkoutExercise represents a single exercise within a workout template.
// It stores the exercise configuration including sets, reps, and progression.
type WorkoutExercise struct {
	ID                string  `json:"id"`
	TemplateID        string  `json:"template_id"`
	Name              string  `json:"name"`
	Sets              int     `json:"sets"`
	Reps              int     `json:"reps"`
	WeightKg          float64 `json:"weight_kg,omitempty"`
	RestSeconds       int     `json:"rest_seconds,omitempty"`
	SortOrder         int     `json:"sort_order"`
	Notes             string  `json:"notes,omitempty"`
	Mode              string  `json:"mode"` // "reps", "time", "cardio"
	Phase             string  `json:"phase"` // "work", "warmup"
	SupersetGroup     string  `json:"superset_group,omitempty"`
	RepsMin           *int    `json:"reps_min,omitempty"`
	RepsMax           *int    `json:"reps_max,omitempty"`
	Progression       string  `json:"progression,omitempty"`
	Increment         float64 `json:"increment,omitempty"`
	DurationSeconds   int     `json:"duration_seconds,omitempty"`
	DurationMinutes   float64 `json:"duration_minutes,omitempty"`
	Speed             float64 `json:"speed,omitempty"`
	PerSide           bool    `json:"per_side"`
	BodyPart          string  `json:"body_part,omitempty"`
	MuscleGroups      string  `json:"muscle_groups,omitempty"`
	ImageURL          string  `json:"imageUrl,omitempty"`
	VideoURL          string  `json:"videoUrl,omitempty"`
	GPSRoute          string  `json:"gpsRoute,omitempty"` // encoded polyline for running routes
	LibraryExerciseID string  `json:"library_exercise_id,omitempty"`
}

// WorkoutDetail is the aggregate returned by GET /workouts/:id/detail.
// It carries the assigned workout plus its exercises (image-joined) and the
// latest in-progress session marker (nil when none exists).
type WorkoutDetail struct {
	Workout   *AssignedWorkout
	Exercises []WorkoutExercise
	Session   *WorkoutSession
}

// AssignedWorkout represents a workout template assigned to a specific athlete.
// It tracks the assignment period, status, and progress.
type AssignedWorkout struct {
	ID            string   `json:"id"`
	AthleteID     string   `json:"athlete_id"`
	AthleteName   string   `json:"athlete_name,omitempty"`
	ContentID     string   `json:"content_id"`
	ContentType   string   `json:"content_type"` // "workout"
	ContentName   string   `json:"content_name"`
	Modality      string   `json:"modality"`
	StartDate     string   `json:"start_date"`
	EndDate       string   `json:"end_date"`
	DaysOfWeek    []int    `json:"days_of_week"`
	Status        string   `json:"status"` // "active", "completed", "paused"
	Progress      float64  `json:"progress"`
	CoachID       string   `json:"coach_id"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

// WorkoutSession represents a single workout session performed by an athlete.
// It tracks when the workout started, the current exercise, and completion status.
type WorkoutSession struct {
	ID                   string `json:"id"`
	WorkoutID            string `json:"workout_id"`
	AthleteID            string `json:"athlete_id"`
	StartedAt            string `json:"started_at"`
	Completed            bool   `json:"completed"`
	CompletedAt          string `json:"completed_at,omitempty"`
	CurrentExerciseIndex int    `json:"current_exercise_index"`
	DurationSeconds      int    `json:"duration_seconds"`
}

// WorkoutSet represents a single logged set within a workout session.
// It records the weight, reps, and completion status for each set.
type WorkoutSet struct {
	ID         string  `json:"id"`
	SessionID  string  `json:"session_id"`
	ExerciseID string  `json:"exercise_id"`
	SetIndex   int     `json:"set_index"`
	WeightKg   float64 `json:"weight_kg,omitempty"`
	Reps       float64 `json:"reps,omitempty"`
	Completed  bool    `json:"completed"`
	LoggedAt   string  `json:"logged_at"`
	Phase      string  `json:"phase,omitempty"` // "work", "warmup"
	RIR        float64 `json:"rir,omitempty"`   // reps in reserve
	RPE        float64 `json:"rpe,omitempty"`   // rate of perceived exertion
	Duration   int     `json:"duration,omitempty"` // seconds for time mode
	Speed      float64 `json:"speed,omitempty"` // speed for cardio mode
	Skipped    bool    `json:"skipped"`
}
