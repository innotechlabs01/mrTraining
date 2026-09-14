package blog

import (
	"context"
)

// Repository defines the persistence interface for articles.
type Repository interface {
	ListArticles(ctx context.Context, page, limit int, publishedOnly bool) ([]*Article, int, error)
	ListByCoach(ctx context.Context, coachID string) ([]*Article, error)
	GetArticle(ctx context.Context, id string) (*Article, error)
	Create(ctx context.Context, a *Article) error
	Update(ctx context.Context, a *Article) error
	Delete(ctx context.Context, id, coachID string) error
}