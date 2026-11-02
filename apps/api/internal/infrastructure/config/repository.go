package configrepo

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/config"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

type repository struct {
	db  *sql.DB
	exec database.Executor
}

func NewRepository(db *sql.DB) config.Repository {
	return &repository{db: db, exec: db}
}

func (r *repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

func (r *repository) WithExecutor(exec database.Executor) config.Repository {
	return &repository{
		db:  r.db,
		exec: exec,
	}
}

func (r *repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

func (r *repository) GetByCoachID(ctx context.Context, coachID string) (*config.PublicPageConfig, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, coach_id, brand_name, tagline, welcome_message, footer_text, created_at, updated_at
		 FROM public_page_config WHERE coach_id = $1`, coachID)

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
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO public_page_config (id, coach_id, brand_name, tagline, welcome_message, footer_text, created_at, updated_at)
		VALUES ($2, $3, $4, $5, $6, $7, NOW(), NOW())
		ON CONFLICT(coach_id) DO UPDATE SET
			brand_name = excluded.brand_name,
			tagline = excluded.tagline,
			welcome_message = excluded.welcome_message,
			footer_text = excluded.footer_text,
			updated_at = NOW()
	`, cfg.ID, cfg.CoachID, cfg.BrandName, cfg.Tagline, cfg.WelcomeMsg, cfg.FooterText)
	if err != nil {
		return fmt.Errorf("failed to upsert public page config: %w", err)
	}
	return nil
}