// Package coach_landing implementa el repositorio de landing pages usando PostgreSQL.
// RLS: solo el coach dueño puede editar; publicado es visible para todos.
package coach_landing

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_landing"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implementa domain.Repository usando PostgreSQL.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository crea un nuevo repositorio.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor inyecta un executor SQL (típicamente *sql.Tx de UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor devuelve una nueva instancia compartiendo el pool pero usando el executor dado.
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reporta si el executor es un *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// Create inserta una nueva landing page.
func (r *Repository) Create(ctx context.Context, lp *domain.LandingPage) error {
	if lp.ID == "" {
		lp.ID = uuid.New().String()
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	lp.CreatedAt = now
	lp.UpdatedAt = now

	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO coach_landing_pages
			(id, coach_id, slug, title, subtitle, config, sections, images, is_published, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		lp.ID, lp.CoachID, lp.Slug, lp.Title, lp.Subtitle, lp.Config, lp.Sections, lp.Images,
		lp.IsPublished, lp.CreatedAt, lp.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert coach landing page: %w", err)
	}
	return nil
}

// GetByID devuelve una landing por ID (solo si pertenece al coach).
func (r *Repository) GetByID(ctx context.Context, id, coachID string) (*domain.LandingPage, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, coach_id, slug, title, subtitle, config, sections, images, is_published, created_at, updated_at
		FROM coach_landing_pages WHERE id = $1 AND coach_id = $2
	`, id, coachID)
	return scanLanding(row)
}

// GetBySlug devuelve una landing publicada por slug (público, sin auth).
func (r *Repository) GetBySlug(ctx context.Context, slug string) (*domain.LandingPage, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, coach_id, slug, title, subtitle, config, sections, images, is_published, created_at, updated_at
		FROM coach_landing_pages WHERE slug = $1 AND is_published = true
	`, slug)
	return scanLanding(row)
}

// GetByCoach devuelve todas las landings de un coach.
func (r *Repository) GetByCoach(ctx context.Context, coachID string) ([]*domain.LandingPage, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, coach_id, slug, title, subtitle, config, sections, images, is_published, created_at, updated_at
		FROM coach_landing_pages WHERE coach_id = $1 ORDER BY updated_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("list coach landing pages: %w", err)
	}
	defer rows.Close()

	out := []*domain.LandingPage{}
	for rows.Next() {
		lp, err := scanLanding(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, lp)
	}
	return out, rows.Err()
}

// Update actualiza una landing existente.
func (r *Repository) Update(ctx context.Context, id, coachID string, in domain.UpdateInput) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	_, err := r.exec.ExecContext(ctx, `
		UPDATE coach_landing_pages
		SET title = COALESCE($1, title),
		    subtitle = COALESCE($2, subtitle),
		    config = COALESCE($3, config),
		    sections = COALESCE($4, sections),
		    images = COALESCE($5, images),
		    updated_at = $6
		WHERE id = $7 AND coach_id = $8
	`, in.Title, in.Subtitle, in.Config, in.Sections, in.Images, now, id, coachID)
	if err != nil {
		return fmt.Errorf("update coach landing page: %w", err)
	}
	return nil
}

// Delete elimina una landing.
func (r *Repository) Delete(ctx context.Context, id, coachID string) error {
	_, err := r.exec.ExecContext(ctx, `
		DELETE FROM coach_landing_pages WHERE id = $1 AND coach_id = $2
	`, id, coachID)
	if err != nil {
		return fmt.Errorf("delete coach landing page: %w", err)
	}
	return nil
}

// Publish publica o despublica una landing.
func (r *Repository) Publish(ctx context.Context, id, coachID string, published bool) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	_, err := r.exec.ExecContext(ctx, `
		UPDATE coach_landing_pages
		SET is_published = $1, updated_at = $2
		WHERE id = $3 AND coach_id = $4
	`, published, now, id, coachID)
	if err != nil {
		return fmt.Errorf("publish coach landing page: %w", err)
	}
	return nil
}

func scanLanding(s interface{ Scan(...interface{}) error }) (*domain.LandingPage, error) {
	var lp domain.LandingPage
	err := s.Scan(&lp.ID, &lp.CoachID, &lp.Slug, &lp.Title, &lp.Subtitle, &lp.Config, &lp.Sections, &lp.Images, &lp.IsPublished, &lp.CreatedAt, &lp.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &lp, nil
}
