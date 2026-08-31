package blog

import (
	"context"
)

// Repository defines the persistence interface for articles.
type Repository interface {
	ListArticles(ctx context.Context, page, limit int) ([]*Article, int, error)
	GetArticle(ctx context.Context, id string) (*Article, error)
}