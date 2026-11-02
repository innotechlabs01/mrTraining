package importdata

// ImportJob represents a data import job (Strong, Hevy, FitNotes CSV).
type ImportJob struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	Source      string  `json:"source"` // strong, hevy, fitnotes
	Status      string  `json:"status"` // pending, processing, completed, failed
	WorkoutsImported int    `json:"workouts_imported"`
	ExercisesImported int   `json:"exercises_imported"`
	ErrorMessage *string `json:"error_message,omitempty"`
	CreatedAt   string  `json:"created_at"`
	CompletedAt *string `json:"completed_at,omitempty"`
}