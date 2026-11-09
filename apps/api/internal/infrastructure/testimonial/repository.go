// Package testimonial implementa el repositorio de testimonios usando PostgreSQL.
package testimonial

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/testimonial"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implementa domain.Repository usando PostgreSQL.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository crea un nuevo repositorio de testimonios.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor inyecta un executor SQL.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor devuelve una nueva instancia compartiendo el pool.
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

// Create inserta un nuevo testimonio.
func (r *Repository) Create(ctx context.Context, t *domain.Testimonial) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	t.CreatedAt = now
	t.UpdatedAt = now

	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO testimonials
			(id, coach_id, name, role, text, stars, is_published, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		t.ID, t.CoachID, t.Name, t.Role, t.Text, t.Stars, t.IsPublished, t.CreatedAt, t.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create testimonial: %w", err)
	}
	return nil
}

// GetByID devuelve un testimonio por ID (solo si pertenece al coach).
func (r *Repository) GetByID(ctx context.Context, id, coachID string) (*domain.Testimonial, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, coach_id, name, role, text, stars, is_published, created_at, updated_at
		FROM testimonials WHERE id = $1 AND coach_id = $2
	`, id, coachID)
	return scanTestimonial(row)
}

// GetByCoach devuelve todos los testimonios publicados de un coach.
func (r *Repository) GetByCoach(ctx context.Context, coachID string) ([]*domain.Testimonial, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, coach_id, name, role, text, stars, is_published, created_at, updated_at
		FROM testimonials WHERE coach_id = $1 AND is_published = true
		ORDER BY created_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("list testimonials: %w", err)
	}
	defer rows.Close()

	out := []*domain.Testimonial{}
	for rows.Next() {
		t, err := scanTestimonial(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// GetPublic devuelve testimonios publicados de un coach (público, sin auth).
func (r *Repository) GetPublic(ctx context.Context, coachID string) ([]*domain.Testimonial, error) {
	return r.GetByCoach(ctx, coachID)
}

// Update actualiza un testimonio existente.
func (r *Repository) Update(ctx context.Context, id, coachID string, in domain.UpdateInput) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	_, err := r.exec.ExecContext(ctx, `
		UPDATE testimonials
		SET name = COALESCE($1, name),
		    role = COALESCE($2, role),
		    text = COALESCE($3, text),
		    stars = COALESCE($4, stars),
		    is_published = COALESCE($5, is_published),
		    updated_at = $6
		WHERE id = $7 AND coach_id = $8
	`, in.Name, in.Role, in.Text, in.Stars, in.IsPublished, now, id, coachID)
	if err != nil {
		return fmt.Errorf("update testimonial: %w", err)
	}
	return nil
}

// Delete elimina un testimonio.
func (r *Repository) Delete(ctx context.Context, id, coachID string) error {
	_, err := r.exec.ExecContext(ctx, `
		DELETE FROM testimonials WHERE id = $1 AND coach_id = $2
	`, id, coachID)
	if err != nil {
		return fmt.Errorf("delete testimonial: %w", err)
	}
	return nil
}

// PublicTestimonials devuelve testimonios publicados de un coach para la landing.
func (r *Repository) PublicTestimonials(ctx context.Context, coachID string) ([]*domain.Testimonial, error) {
	return r.GetByCoach(ctx, coachID)
}

// GetAllPublic devuelve todos los testimonios publicados (para landing principal).
func (r *Repository) GetAllPublic(ctx context.Context) ([]*domain.Testimonial, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, coach_id, name, role, text, stars, is_published, created_at, updated_at
		FROM testimonials WHERE is_published = true
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list public testimonials: %w", err)
	}
	defer rows.Close()

	out := []*domain.Testimonial{}
	for rows.Next() {
		t, err := scanTestimonial(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func scanTestimonial(s interface{ Scan(...interface{}) error }) (*domain.Testimonial, error) {
	var t domain.Testimonial
	err := s.Scan(&t.ID, &t.CoachID, &t.Name, &t.Role, &t.Text, &t.Stars, &t.IsPublished, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}
