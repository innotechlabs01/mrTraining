package favorite

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/favorite"
)

// Service handles favorite business logic.
type Service struct {
	repo favorite.Repository
}

// NewService creates a new favorite service.
func NewService(repo favorite.Repository) *Service {
	return &Service{repo: repo}
}

// ListFavorites returns all favorites for an athlete.
func (s *Service) ListFavorites(ctx context.Context, athleteID string) ([]*favorite.Favorite, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListFavorites(ctx, athleteID)
}

// CreateFavorite adds a new favorite for the athlete.
func (s *Service) CreateFavorite(ctx context.Context, athleteID, itemType, itemID, itemTitle string, itemMeta *string) (*favorite.Favorite, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if itemType == "" || itemID == "" || itemTitle == "" {
		return nil, fmt.Errorf("item type, ID, and title are required")
	}

	// Check if already favorited
	existing, _ := s.repo.GetFavorite(ctx, athleteID, itemID)
	if existing != nil {
		return nil, fmt.Errorf("item already favorited")
	}

	f := &favorite.Favorite{
		ID:         uuid.New().String(),
		AthleteID:  athleteID,
		ItemType:   itemType,
		ItemID:     itemID,
		ItemTitle:  itemTitle,
		ItemMeta:   itemMeta,
		CreatedAt:  uuid.New().String(), // placeholder; repo will set timestamp
	}

	if err := s.repo.CreateFavorite(ctx, f); err != nil {
		return nil, err
	}
	return f, nil
}

// DeleteFavorite removes a favorite.
func (s *Service) DeleteFavorite(ctx context.Context, athleteID, favoriteID string) error {
	if athleteID == "" {
		return fmt.Errorf("athlete ID is required")
	}
	if favoriteID == "" {
		return fmt.Errorf("favorite ID is required")
	}
	return s.repo.DeleteFavorite(ctx, athleteID, favoriteID)
}