package blog

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/blog"
)

// Repository implements the blog.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new blog repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListArticles returns a paginated list of articles.
func (r *Repository) ListArticles(ctx context.Context, page, limit int) ([]*blog.Article, int, error) {
	offset := (page - 1) * limit

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, slug, excerpt, content, author_id, published_at, tags, created_at, updated_at
		FROM blog_articles
		WHERE published_at IS NOT NULL AND published_at <= datetime('now')
		ORDER BY published_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		// Table may not exist, return empty
		return []*blog.Article{}, 0, nil
	}
	defer rows.Close()

	var articles []*blog.Article
	for rows.Next() {
		var a blog.Article
		var tagsJSON sql.NullString
		if err := rows.Scan(&a.ID, &a.Title, &a.Slug, &a.Excerpt, &a.Content, &a.AuthorID, &a.PublishedAt, &tagsJSON, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("failed to scan article: %w", err)
		}
		if tagsJSON.Valid {
			_ = json.Unmarshal([]byte(tagsJSON.String), &a.Tags)
		}
		articles = append(articles, &a)
	}

	// Get total count
	var total int
	err = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM blog_articles
		WHERE published_at IS NOT NULL AND published_at <= datetime('now')
	`).Scan(&total)
	if err != nil {
		total = 0
	}

	return articles, total, nil
}

// GetArticle returns a single article by ID.
func (r *Repository) GetArticle(ctx context.Context, id string) (*blog.Article, error) {
	var a blog.Article
	var tagsJSON sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, title, slug, excerpt, content, author_id, published_at, tags, created_at, updated_at
		FROM blog_articles
		WHERE id = ? AND published_at IS NOT NULL AND published_at <= datetime('now')
	`, id).Scan(&a.ID, &a.Title, &a.Slug, &a.Excerpt, &a.Content, &a.AuthorID, &a.PublishedAt, &tagsJSON, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("article not found")
		}
		return nil, fmt.Errorf("failed to get article: %w", err)
	}
	if tagsJSON.Valid {
		_ = json.Unmarshal([]byte(tagsJSON.String), &a.Tags)
	}
	return &a, nil
}

// Helper to marshal tags
func marshalTags(tags []string) (string, error) {
	if tags == nil {
		return "[]", nil
	}
	b, err := json.Marshal(tags)
	if err != nil {
		return "[]", err
	}
	return string(b), nil
}

// Helper to split comma-separated tags string
func splitTags(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}