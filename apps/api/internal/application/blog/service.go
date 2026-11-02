package blog

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/blog"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service handles blog business logic.
type Service struct {
	repo blog.Repository
}

// NewService creates a new blog service.
func NewService(repo blog.Repository) *Service {
	return &Service{repo: repo}
}

// ListArticles returns a paginated list of published articles (newest-first).
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
	return s.repo.ListArticles(ctx, page, limit, true)
}

// GetArticle returns a single article by ID.
func (s *Service) GetArticle(ctx context.Context, id string) (*blog.Article, error) {
	if id == "" {
		return nil, fmt.Errorf("article ID is required")
	}
	a, err := s.repo.GetArticle(ctx, id)
	if err != nil {
		return nil, errors.NotFound("article", id)
	}
	return a, nil
}

// ListByCoach returns all articles (drafts included) for a coach.
func (s *Service) ListByCoach(ctx context.Context, coachID string) ([]*blog.Article, error) {
	if coachID == "" {
		return nil, fmt.Errorf("coach ID is required")
	}
	return s.repo.ListByCoach(ctx, coachID)
}

// CreateArticle validates and persists a new article.
func (s *Service) CreateArticle(ctx context.Context, a *blog.Article) error {
	if err := validate(a); err != nil {
		return err
	}
	if a.ReadTimeMinutes == 0 {
		a.ReadTimeMinutes = 5
	}
	return s.repo.Create(ctx, a)
}

// UpdateArticle validates and updates an existing article.
func (s *Service) UpdateArticle(ctx context.Context, a *blog.Article) error {
	if err := validate(a); err != nil {
		return err
	}
	return s.repo.Update(ctx, a)
}

// DeleteArticle removes an article owned by the coach.
func (s *Service) DeleteArticle(ctx context.Context, id, coachID string) error {
	if id == "" {
		return fmt.Errorf("article ID is required")
	}
	return s.repo.Delete(ctx, id, coachID)
}

func validate(a *blog.Article) error {
	if a.Title == "" {
		return errors.BadRequest("title is required")
	}
	if a.Slug == "" {
		return errors.BadRequest("slug is required")
	}
	if a.AuthorID == "" {
		return errors.BadRequest("author is required")
	}
	return nil
}