// Package formrecording holds the domain types for athlete form-check
// video recordings uploaded from the mobile app.
package formrecording

// FormRecording represents an uploaded form-check video with its
// AI analysis metadata.
type FormRecording struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	ExerciseID  string  `json:"exercise_id"`
	WorkoutID   string  `json:"workout_id,omitempty"`
	FormScore   float64 `json:"form_score"`
	FormMetrics string  `json:"form_metrics"` // raw JSON payload from the client
	VideoURL    string  `json:"video_url"`
	CreatedAt   string  `json:"created_at"`
}
