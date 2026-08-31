package importdata

// ImportJob represents a bulk data import job from an external source (strong, hevy, fitnotes).
type ImportJob struct {
	ID                string  `json:"id"`
	AthleteID         string  `json:"athlete_id"`
	Source            string  `json:"source"`
	Status            string  `json:"status"`
	WorkoutsImported  int     `json:"workouts_imported"`
	ExercisesImported int     `json:"exercises_imported"`
	ErrorMessage      *string `json:"error_message,omitempty"`
	CreatedAt         string  `json:"created_at"`
	CompletedAt       *string `json:"completed_at,omitempty"`
}
