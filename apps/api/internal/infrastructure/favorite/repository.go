package favorite

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/favorite"
)

// Repository implements the favorite.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new favorite repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListFavorites returns all favorites for an athlete.
func (r *Repository) ListFavorites(ctx context.Context, athleteID string) ([]*favorite.Favorite, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, item_type, item_id, item_title, item_meta, created_at
		FROM athlete_favorites
		WHERE athlete_id = ?
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
	err := r.db.QueryRowContext(ctx, `
		SELECT id, athlete_id, item_type, item_id, item_title, item_meta, created_at
		FROM athlete_favorites
		WHERE athlete_id = ? AND id = ?
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
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO athlete_favorites (id, athlete_id, item_type, item_id, item_title, item_meta, created_at)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
	`, f.ID, f.AthleteID, f.ItemType, f.ItemID, f.ItemTitle, f.ItemMeta)
	if err != nil {
		return fmt.Errorf("failed to create favorite: %w", err)
	}
	return nil
}

// DeleteFavorite removes a favorite.
func (r *Repository) DeleteFavorite(ctx context.Context, athleteID, favoriteID string) error {
	result, err := r.db.ExecContext(ctx, `
		DELETE FROM athlete_favorites
		WHERE athlete_id = ? AND id = ?
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