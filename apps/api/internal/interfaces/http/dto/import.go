package dto

// ImportDataRequest is the payload for importing CSV data.
type ImportDataRequest struct {
	Source   string `json:"source"`   // strong, hevy, fitnotes
	CSVData  string `json:"csv_data"` // raw CSV content
}

// ImportJobResponse is the response shape for an import job.
type ImportJobResponse struct {
	ID                string  `json:"id"`
	Source            string  `json:"source"`
	Status            string  `json:"status"`
	WorkoutsImported  int     `json:"workouts_imported"`
	ExercisesImported int     `json:"exercises_imported"`
	ErrorMessage      *string `json:"error_message,omitempty"`
	CreatedAt         string  `json:"created_at"`
	CompletedAt       *string `json:"completed_at,omitempty"`
}