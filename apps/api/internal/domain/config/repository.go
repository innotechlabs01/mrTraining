package config

import "context"

// Repository defines the data access interface for public page config.
type Repository interface {
	GetByCoachID(ctx context.Context, coachID string) (*PublicPageConfig, error)
	Upsert(ctx context.Context, cfg *PublicPageConfig) error
}