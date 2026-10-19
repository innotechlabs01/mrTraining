// Package checkin defines the morning readiness check-in domain.
package checkin

import "context"

// Checkin is one athlete's subjective readiness for a given day.
type Checkin struct {
	ID         string  `json:"id"`
	AthleteID  string  `json:"athlete_id"`
	Date       string  `json:"date"` // YYYY-MM-DD
	Readiness  int     `json:"readiness"`   // 1..5
	SleepHours float64 `json:"sleep_hours,omitempty"`
	Soreness   int     `json:"soreness,omitempty"` // 1..5
	Notes      string  `json:"notes,omitempty"`
	CreatedAt  string  `json:"created_at"`
}

// Repository persists check-ins.
type Repository interface {
	// Upsert stores the day's check-in (one per athlete per date).
	Upsert(ctx context.Context, c *Checkin) error
	// GetByDate returns the athlete's check-in for a date, or ErrNotFound.
	GetByDate(ctx context.Context, athleteID, date string) (*Checkin, error)
	// ListRecent returns the last n check-ins, newest first.
	ListRecent(ctx context.Context, athleteID string, limit int) ([]*Checkin, error)
}
