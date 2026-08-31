package dto

// RecordVideoViewRequest is the payload for recording a video view.
type RecordVideoViewRequest struct {
	ExerciseID     string `json:"exercise_id"`
	Action         string `json:"action"`           // start, progress, complete
	ProgressPct    *int   `json:"progress_pct,omitempty"`
	WatchDuration  *int   `json:"watch_duration,omitempty"` // seconds
}

// VideoViewResponse is the response shape for a video view.
type VideoViewResponse struct {
	ID            string  `json:"id"`
	ExerciseID    string  `json:"exercise_id"`
	Action        string  `json:"action"`
	ProgressPct   *int    `json:"progress_pct,omitempty"`
	WatchDuration *int    `json:"watch_duration,omitempty"`
	CreatedAt     string  `json:"created_at"`
}