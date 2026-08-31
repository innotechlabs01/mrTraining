package videoview

// VideoView represents a video view tracking event.
type VideoView struct {
	ID            string  `json:"id"`
	AthleteID     string  `json:"athlete_id"`
	ExerciseID    string  `json:"exercise_id"`
	Action        string  `json:"action"` // start, progress, complete
	ProgressPct   *int    `json:"progress_pct,omitempty"`
	WatchDuration *int    `json:"watch_duration_seconds,omitempty"`
	CreatedAt     string  `json:"created_at"`
}