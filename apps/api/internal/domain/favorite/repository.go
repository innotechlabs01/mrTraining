package favorite

import (
	"context"
)

// Repository defines the persistence interface for favorites.
type Repository interface {
	ListFavorites(ctx context.Context, athleteID string) ([]*Favorite, error)
	GetFavorite(ctx context.Context, athleteID, favoriteID string) (*Favorite, error)
	CreateFavorite(ctx context.Context, f *Favorite) error
	DeleteFavorite(ctx context.Context, athleteID, favoriteID string) error
}