package routine

import "time"

// Routine represents a custom athlete routine (saved workout plan).
type Routine struct {
	ID          string    `json:"id"`
	AthleteID   string    `json:"athlete_id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Exercises   string    `json:"exercises"` // JSON array of exercises
	DurationMin int       `json:"duration_min,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Repository defines the storage interface for routines.
type Repository interface {
	ListByAthleteID(athleteID string) ([]*Routine, error)
	GetByID(id string) (*Routine, error)
	Create(r *Routine) error
	Update(r *Routine) error
	Delete(id, athleteID string) error
}
