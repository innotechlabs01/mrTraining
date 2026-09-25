package configrepo

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/config"
)

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) config.Repository {
	return &repository{db: db}
}

func (r *repository) GetByCoachID(ctx context.Context, coachID string) (*config.PublicPageConfig, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, coach_id, brand_name, tagline, welcome_message, footer_text, created_at, updated_at
		 FROM public_page_config WHERE coach_id = ?`, coachID)

	var cfg config.PublicPageConfig
	var welcomeMsg, footer sql.NullString
	err := row.Scan(&cfg.ID, &cfg.CoachID, &cfg.BrandName, &cfg.Tagline, &welcomeMsg, &footer, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil // not found
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get public page config: %w", err)
	}
	if welcomeMsg.Valid {
		cfg.WelcomeMsg = welcomeMsg.String
	}
	if footer.Valid {
		cfg.FooterText = footer.String
	}
	if cfg.Tagline == "" && footer.Valid {
		cfg.Tagline = footer.String
	}
	return &cfg, nil
}

func (r *repository) Upsert(ctx context.Context, cfg *config.PublicPageConfig) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO public_page_config (id, coach_id, brand_name, tagline, welcome_message, footer_text, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
		ON CONFLICT(coach_id) DO UPDATE SET
			brand_name = excluded.brand_name,
			tagline = excluded.tagline,
			welcome_message = excluded.welcome_message,
			footer_text = excluded.footer_text,
			updated_at = datetime('now')
	`, cfg.ID, cfg.CoachID, cfg.BrandName, cfg.Tagline, cfg.WelcomeMsg, cfg.FooterText)
	if err != nil {
		return fmt.Errorf("failed to upsert public page config: %w", err)
	}
	return nil
}