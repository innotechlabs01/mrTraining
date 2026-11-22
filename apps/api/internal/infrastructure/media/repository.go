package media

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/media"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository is the PostgreSQL implementation of domain/media.Repository.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new media Repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db:   db,
		exec: db,
	}
}

// withRLS runs fn inside a transaction with app.current_user_id,
// app.current_coach_id, and app.current_role set for FORCE ROW LEVEL SECURITY.
func (r *Repository) withRLS(ctx context.Context, fn func(tx *sql.Tx) error) error {
	if r.db == nil {
		return errors.New("database connection is nil")
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin media tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	actor := domain.ActorFromContext(ctx)
	if _, err := tx.ExecContext(ctx,
		`SELECT set_config('app.current_user_id', $1, true),
		        set_config('app.current_coach_id', $2, true),
		        set_config('app.current_role', $3, true)`,
		actor.UserID, actor.CoachID, actor.Role,
	); err != nil {
		return fmt.Errorf("set media RLS config: %w", err)
	}

	if err := fn(tx); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit media tx: %w", err)
	}
	return nil
}

func (r *Repository) Create(ctx context.Context, obj *domain.MediaObject) error {
	const q = `
		INSERT INTO public.media_objects (
			id, object_key, bucket, owner_user_id, coach_id,
			purpose, visibility, content_type, size_bytes, status, resource_id, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	return r.withRLS(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, q,
			obj.ID, obj.ObjectKey, obj.Bucket, obj.OwnerUserID, obj.CoachID,
			string(obj.Purpose), string(obj.Visibility), obj.ContentType, obj.SizeBytes,
			string(obj.Status), obj.ResourceID, obj.CreatedAt,
		); err != nil {
			return fmt.Errorf("insert media_object: %w", err)
		}
		return nil
	})
}

func (r *Repository) GetByID(ctx context.Context, id string) (*domain.MediaObject, error) {
	const q = `
		SELECT id, object_key, bucket, owner_user_id, coach_id,
		       purpose, visibility, content_type, size_bytes, status, resource_id,
		       created_at, confirmed_at, deleted_at
		FROM public.media_objects
		WHERE id = $1`
	var obj *domain.MediaObject
	err := r.withRLS(ctx, func(tx *sql.Tx) error {
		var err error
		obj, err = scanMediaObject(tx.QueryRowContext(ctx, q, id))
		return err
	})
	return obj, err
}

func (r *Repository) GetByKey(ctx context.Context, key string) (*domain.MediaObject, error) {
	const q = `
		SELECT id, object_key, bucket, owner_user_id, coach_id,
		       purpose, visibility, content_type, size_bytes, status, resource_id,
		       created_at, confirmed_at, deleted_at
		FROM public.media_objects
		WHERE object_key = $1`
	var obj *domain.MediaObject
	err := r.withRLS(ctx, func(tx *sql.Tx) error {
		var err error
		obj, err = scanMediaObject(tx.QueryRowContext(ctx, q, key))
		return err
	})
	return obj, err
}

func (r *Repository) GetByKeys(ctx context.Context, keys []string) ([]*domain.MediaObject, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	const q = `
		SELECT id, object_key, bucket, owner_user_id, coach_id,
		       purpose, visibility, content_type, size_bytes, status, resource_id,
		       created_at, confirmed_at, deleted_at
		FROM public.media_objects
		WHERE object_key = ANY($1)`
	var out []*domain.MediaObject
	err := r.withRLS(ctx, func(tx *sql.Tx) error {
		rows, err := tx.QueryContext(ctx, q, keys)
		if err != nil {
			return fmt.Errorf("query media_objects by keys: %w", err)
		}
		defer rows.Close()
		for rows.Next() {
			obj, err := scanMediaObject(rows)
			if err != nil {
				return err
			}
			out = append(out, obj)
		}
		return rows.Err()
	})
	return out, err
}

func (r *Repository) MarkReady(ctx context.Context, id string, sizeBytes int64, contentType string, confirmedAt time.Time) error {
	const q = `
		UPDATE public.media_objects
		SET status = 'ready',
		    size_bytes = $2,
		    content_type = $3,
		    confirmed_at = $4
		WHERE id = $1 AND status <> 'deleted'`
	return r.withRLS(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, q, id, sizeBytes, contentType, confirmedAt)
		if err != nil {
			return fmt.Errorf("mark media_object ready: %w", err)
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return domain.ErrNotFound
		}
		return nil
	})
}

func (r *Repository) MarkDeleted(ctx context.Context, id string, deletedAt time.Time) error {
	const q = `
		UPDATE public.media_objects
		SET status = 'deleted',
		    deleted_at = $2
		WHERE id = $1`
	return r.withRLS(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, q, id, deletedAt)
		if err != nil {
			return fmt.Errorf("mark media_object deleted: %w", err)
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return domain.ErrNotFound
		}
		return nil
	})
}

func (r *Repository) HasActiveCoachAthleteLink(ctx context.Context, coachID, athleteUserID string) (bool, error) {
	if coachID == "" || athleteUserID == "" {
		return false, nil
	}
	var exists bool
	if err := r.exec.QueryRowContext(ctx, `SELECT public.has_active_coach_athlete_link($1, $2)`, coachID, athleteUserID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check coach_athlete_links: %w", err)
	}
	return exists, nil
}

func (r *Repository) IsSupportTicketParticipant(ctx context.Context, userID, objectRef string) (bool, error) {
	if userID == "" || objectRef == "" {
		return false, nil
	}
	var exists bool
	if err := r.exec.QueryRowContext(ctx, `SELECT public.is_media_ticket_participant($1, $2)`, userID, objectRef).Scan(&exists); err != nil {
		return false, fmt.Errorf("check support ticket participant: %w", err)
	}
	return exists, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanMediaObject(s scanner) (*domain.MediaObject, error) {
	var (
		obj        domain.MediaObject
		purpose    string
		visibility string
		status     string
	)
	err := s.Scan(
		&obj.ID,
		&obj.ObjectKey,
		&obj.Bucket,
		&obj.OwnerUserID,
		&obj.CoachID,
		&purpose,
		&visibility,
		&obj.ContentType,
		&obj.SizeBytes,
		&status,
		&obj.ResourceID,
		&obj.CreatedAt,
		&obj.ConfirmedAt,
		&obj.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("scan media_object: %w", err)
	}
	obj.Purpose = domain.Purpose(purpose)
	obj.Visibility = domain.Visibility(visibility)
	obj.Status = domain.Status(status)
	return &obj, nil
}
