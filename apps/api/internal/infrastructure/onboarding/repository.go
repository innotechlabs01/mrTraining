package onboarding

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/onboarding"
)

// Repository implements onboarding.Repository using database/sql with Turso.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new onboarding repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Save persists the onboarding data (upsert by athlete).
func (r *Repository) Save(ctx context.Context, d *onboarding.OnboardingData) error {
	sportsJSON, _ := json.Marshal(d.Sports)
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO athlete_onboarding (athlete_id, sports, modality, experience_level, goal,
		 sessions_per_week, session_duration, equipment, athlete_routine_accepted, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
		 ON CONFLICT(athlete_id) DO UPDATE SET
		   sports=excluded.sports, modality=excluded.modality, experience_level=excluded.experience_level,
		   goal=excluded.goal, sessions_per_week=excluded.sessions_per_week,
		   session_duration=excluded.session_duration, equipment=excluded.equipment,
		   athlete_routine_accepted=excluded.athlete_routine_accepted, updated_at=datetime('now')`,
		d.AthleteID, string(sportsJSON), d.Modality, d.ExperienceLevel, d.Goal,
		d.SessionsPerWeek, d.SessionDuration, d.Equipment, d.AthleteRoutineAccepted)
	if err != nil {
		return fmt.Errorf("failed to save onboarding: %w", err)
	}
	return nil
}

// Get retrieves the onboarding data for an athlete.
func (r *Repository) Get(ctx context.Context, athleteID string) (*onboarding.OnboardingData, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT athlete_id, sports, modality, experience_level, goal,
		 sessions_per_week, session_duration, equipment, athlete_routine_accepted
		 FROM athlete_onboarding WHERE athlete_id = ?`, athleteID)

	d := &onboarding.OnboardingData{}
	var sportsJSON string
	err := row.Scan(&d.AthleteID, &sportsJSON, &d.Modality, &d.ExperienceLevel, &d.Goal,
		&d.SessionsPerWeek, &d.SessionDuration, &d.Equipment, &d.AthleteRoutineAccepted)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("onboarding data not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get onboarding: %w", err)
	}
	d.Sports = parseJSONArray(sportsJSON)
	return d, nil
}

func parseJSONArray(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []string{}
	}
	return out
}
