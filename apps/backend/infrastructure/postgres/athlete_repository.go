package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/internal/athlete"
)

type AthleteRepository struct {
	db *pgxpool.Pool
}

func NewAthleteRepository(db *pgxpool.Pool) *AthleteRepository {
	return &AthleteRepository{db: db}
}

func (r *AthleteRepository) Save(ctx context.Context, a *athlete.Athlete) error {
	query := `
		INSERT INTO athletes (id, user_id, organization_id, primary_sport, experience_level, height_cm, weight_kg, body_fat_pct, injury_status, training_status, goals, settings, coach_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (id) DO UPDATE SET
			primary_sport = EXCLUDED.primary_sport,
			experience_level = EXCLUDED.experience_level,
			height_cm = EXCLUDED.height_cm,
			weight_kg = EXCLUDED.weight_kg,
			body_fat_pct = EXCLUDED.body_fat_pct,
			injury_status = EXCLUDED.injury_status,
			training_status = EXCLUDED.training_status,
			goals = EXCLUDED.goals,
			settings = EXCLUDED.settings,
			coach_id = EXCLUDED.coach_id,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.Exec(ctx, query,
		a.ID(), a.UserID(), a.OrganizationID(), a.PrimarySport(), a.ExperienceLevel(),
		a.HeightCm(), a.WeightKg(), a.BodyFatPct(), a.InjuryStatus(), a.TrainingStatus(),
		a.Goals(), a.Settings(), a.CoachID(), a.CreatedAt(), a.UpdatedAt(),
	)
	return err
}

func (r *AthleteRepository) FindByID(ctx context.Context, id, orgID uuid.UUID) (*athlete.Athlete, error) {
	// Simplified - would need proper reconstruction
	return nil, nil
}

func (r *AthleteRepository) FindByUserID(ctx context.Context, userID, orgID uuid.UUID) (*athlete.Athlete, error) {
	return nil, nil
}

func (r *AthleteRepository) FindByCoach(ctx context.Context, coachID, orgID uuid.UUID) ([]*athlete.Athlete, error) {
	rows, err := r.db.Query(ctx, `
		SELECT a.id, a.user_id, u.first_name, u.last_name, u.avatar_url, a.primary_sport, a.experience_level
		FROM athletes a
		JOIN users u ON a.user_id = u.id
		WHERE a.coach_id = $1 AND a.organization_id = $2
	`, coachID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var athletes []*athlete.Athlete
	for rows.Next() {
		// In production, reconstruct from DB
	}
	return athletes, rows.Err()
}

func (r *AthleteRepository) WithReadiness(ctx context.Context, athleteIDs []uuid.UUID) (map[uuid.UUID]*athlete.ReadinessScore, error) {
	return make(map[uuid.UUID]*athlete.ReadinessScore), nil
}
