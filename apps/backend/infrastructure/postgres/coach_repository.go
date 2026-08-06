package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/internal/coach"
)

type CoachRepository struct {
	db *pgxpool.Pool
}

func NewCoachRepository(db *pgxpool.Pool) *CoachRepository {
	return &CoachRepository{db: db}
}

func (r *CoachRepository) Save(ctx context.Context, c *coach.Coach) error {
	query := `
		INSERT INTO coaches (id, user_id, organization_id, specializations, certifications, cert_level, bio, experience_years, website_url, instagram_handle, youtube_handle, athlete_count, max_athletes, is_verified, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		ON CONFLICT (id) DO UPDATE SET
			specializations = EXCLUDED.specializations,
			certifications = EXCLUDED.certifications,
			cert_level = EXCLUDED.cert_level,
			bio = EXCLUDED.bio,
			experience_years = EXCLUDED.experience_years,
			website_url = EXCLUDED.website_url,
			instagram_handle = EXCLUDED.instagram_handle,
			youtube_handle = EXCLUDED.youtube_handle,
			athlete_count = EXCLUDED.athlete_count,
			max_athletes = EXCLUDED.max_athletes,
			is_verified = EXCLUDED.is_verified,
			status = EXCLUDED.status,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.Exec(ctx, query,
		c.ID(), c.UserID(), c.OrganizationID(), c.Specializations(), c.Certifications(),
		c.CertLevel(), c.Bio(), c.ExperienceYears(), c.WebsiteURL(), c.InstagramHandle(), c.YoutubeHandle(),
		c.AthleteCount(), c.MaxAthletes(), c.IsVerified(), c.Status(), c.CreatedAt(), c.UpdatedAt(),
	)
	return err
}

func (r *CoachRepository) FindByID(ctx context.Context, id, orgID uuid.UUID) (*coach.Coach, error) {
	return nil, nil
}

func (r *CoachRepository) FindByUserID(ctx context.Context, userID, orgID uuid.UUID) (*coach.Coach, error) {
	return nil, nil
}

func (r *CoachRepository) FindAll(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*coach.Coach, error) {
	return nil, nil
}
