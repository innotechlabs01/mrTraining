package favorite

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/favorite"
)

// Repository implements the favorite.Repository interface using libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new favorite repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}
// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) favorite.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// ListFavorites returns all favorites for an athlete.
func (r *Repository) ListFavorites(ctx context.Context, athleteID string) ([]*favorite.Favorite, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, item_type, item_id, item_title, item_meta, created_at
		FROM athlete_favorites
		WHERE athlete_id = $1
		ORDER BY created_at DESC
	`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list favorites: %w", err)
	}
	defer rows.Close()

	var favorites []*favorite.Favorite
	for rows.Next() {
		var f favorite.Favorite
		var itemMeta sql.NullString
		if err := rows.Scan(&f.ID, &f.AthleteID, &f.ItemType, &f.ItemID, &f.ItemTitle, &itemMeta, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan favorite: %w", err)
		}
		if itemMeta.Valid {
			f.ItemMeta = &itemMeta.String
		}
		favorites = append(favorites, &f)
	}
	return favorites, nil
}

// GetFavorite returns a specific favorite by ID for the athlete.
func (r *Repository) GetFavorite(ctx context.Context, athleteID, favoriteID string) (*favorite.Favorite, error) {
	var f favorite.Favorite
	var itemMeta sql.NullString
	err := r.exec.QueryRowContext(ctx, `
		SELECT id, athlete_id, item_type, item_id, item_title, item_meta, created_at
		FROM athlete_favorites
		WHERE athlete_id = $1 AND id = $2
	`, athleteID, favoriteID).Scan(&f.ID, &f.AthleteID, &f.ItemType, &f.ItemID, &f.ItemTitle, &itemMeta, &f.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("favorite not found")
		}
		return nil, fmt.Errorf("failed to get favorite: %w", err)
	}
	if itemMeta.Valid {
		f.ItemMeta = &itemMeta.String
	}
	return &f, nil
}

// CreateFavorite inserts a new favorite.
func (r *Repository) CreateFavorite(ctx context.Context, f *favorite.Favorite) error {
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO athlete_favorites (id, athlete_id, item_type, item_id, item_title, item_meta, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`, f.ID, f.AthleteID, f.ItemType, f.ItemID, f.ItemTitle, f.ItemMeta)
	if err != nil {
		return fmt.Errorf("failed to create favorite: %w", err)
	}
	return nil
}

// DeleteFavorite removes a favorite.
func (r *Repository) DeleteFavorite(ctx context.Context, athleteID, favoriteID string) error {
	result, err := r.exec.ExecContext(ctx, `
		DELETE FROM athlete_favorites
		WHERE athlete_id = $1 AND id = $2
	`, athleteID, favoriteID)
	if err != nil {
		return fmt.Errorf("failed to delete favorite: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("favorite not found")
	}
	return nil
}