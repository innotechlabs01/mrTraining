package blog

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/blog"
)

// Service handles blog business logic.
type Service struct {
	repo blog.Repository
}

// NewService creates a new blog service.
func NewService(repo blog.Repository) *Service {
	return &Service{repo: repo}
}

// ListArticles returns a paginated list of articles.
func (s *Service) ListArticles(ctx context.Context, page, limit int) ([]*blog.Article, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.repo.ListArticles(ctx, page, limit)
}

// GetArticle returns a single article by ID.
func (s *Service) GetArticle(ctx context.Context, id string) (*blog.Article, error) {
	if id == "" {
		return nil, fmt.Errorf("article ID is required")
	}
	return s.repo.GetArticle(ctx, id)
}