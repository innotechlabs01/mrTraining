package training

import "github.com/google/uuid"

// TrainingSession represents a scheduled training session between coach and athlete.
type TrainingSession struct {
	ID         string `json:"id"`
	CoachID    string `json:"coach_id"`
	AthleteID  string `json:"athlete_id"`
	Title      string `json:"title"`
	ScheduledAt string `json:"scheduled_at"`
	EndAt      string `json:"end_at,omitempty"`
	Location   string `json:"location,omitempty"`
	Status     string `json:"status"` // scheduled, completed, cancelled
	Notes      string `json:"notes,omitempty"`
}

// NewTrainingSession creates a new TrainingSession aggregate with generated ID.
func NewTrainingSession(coachID, athleteID, title, scheduledAt, status string) *TrainingSession {
	return &TrainingSession{
		ID:          uuid.New().String(),
		CoachID:     coachID,
		AthleteID:   athleteID,
		Title:       title,
		ScheduledAt: scheduledAt,
		Status:      status,
	}
}
