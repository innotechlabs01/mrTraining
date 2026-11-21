package blog

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/domain/blog"
)

// Repository implements the blog.Repository interface using libsql.
// It reads and writes the shared `blog_posts` / `blog_post_meta` tables so the
// web dashboard and the mobile app share one source of truth.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new blog repository.
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
func (r *Repository) WithExecutor(exec database.Executor) blog.Repository {
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

const articleColumns = `
	p.id, p.slug, p.title, COALESCE(p.excerpt, ''), p.content, COALESCE(p.category, ''),
	COALESCE(p.tags, '[]'), COALESCE(NULLIF(p.image_url, ''), COALESCE(p.cover_image_url, '')),
	COALESCE(p.is_published, 0), COALESCE(p.published_at::text, ''), p.coach_id, p.created_at::text, p.updated_at::text,
	COALESCE(m.read_time_minutes, 5), COALESCE(m.views, 0)
`

const articleFrom = `
	FROM blog_posts p
	LEFT JOIN blog_post_meta m ON m.post_id = p.id
`

// ListArticles returns a paginated list of articles ordered newest-first.
// publishedOnly restricts to published posts only (athlete-facing).
func (r *Repository) ListArticles(ctx context.Context, page, limit int, publishedOnly bool) ([]*blog.Article, int, error) {
	offset := (page - 1) * limit
	where := ""
	if publishedOnly {
		where = "WHERE p.is_published = 1"
	}

	rows, err := r.exec.QueryContext(ctx, fmt.Sprintf(`
		SELECT %s %s %s
		ORDER BY COALESCE(p.published_at, p.created_at) DESC
		LIMIT $1 OFFSET $2
	`, articleColumns, articleFrom, where), limit, offset)
	if err != nil {
		// Table may not exist, return empty
		return []*blog.Article{}, 0, nil
	}
	defer rows.Close()

	var articles []*blog.Article
	for rows.Next() {
		a, err := scanArticle(rows)
		if err != nil {
			return nil, 0, err
		}
		articles = append(articles, a)
	}

	var total int
	err = r.exec.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM blog_posts p %s`, where)).Scan(&total)
	if err != nil {
		total = 0
	}

	return articles, total, nil
}

// ListByCoach returns all articles (drafts included) for a coach, newest-first.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*blog.Article, error) {
	rows, err := r.exec.QueryContext(ctx, fmt.Sprintf(`
		SELECT %s %s
		WHERE p.coach_id = $1
		ORDER BY COALESCE(p.published_at, p.created_at) DESC
	`, articleColumns, articleFrom), coachID)
	if err != nil {
		return []*blog.Article{}, nil
	}
	defer rows.Close()

	var articles []*blog.Article
	for rows.Next() {
		a, err := scanArticle(rows)
		if err != nil {
			return nil, err
		}
		articles = append(articles, a)
	}
	return articles, nil
}

// GetArticle returns a single article by ID.
func (r *Repository) GetArticle(ctx context.Context, id string) (*blog.Article, error) {
	row := r.exec.QueryRowContext(ctx, fmt.Sprintf(`
		SELECT %s %s
		WHERE p.id = $1
	`, articleColumns, articleFrom), id)
	a, err := scanArticle(row)
	if err != nil {
		return nil, err
	}
	if a.IsPublished {
		r.incrementViews(ctx, a.ID)
		a.Views++
	}
	return a, nil
}

// GetArticleBySlug returns a single published article by slug.
func (r *Repository) GetArticleBySlug(ctx context.Context, slug string) (*blog.Article, error) {
	row := r.exec.QueryRowContext(ctx, fmt.Sprintf(`
		SELECT %s %s
		WHERE p.slug = $1 AND COALESCE(p.is_published, 0) = 1
	`, articleColumns, articleFrom), slug)
	a, err := scanArticle(row)
	if err != nil {
		return nil, err
	}
	r.incrementViews(ctx, a.ID)
	a.Views++
	return a, nil
}

func (r *Repository) incrementViews(ctx context.Context, postID string) {
	_, _ = r.exec.ExecContext(ctx, `UPDATE blog_post_meta SET views = views + 1 WHERE post_id = $1`, postID)
}

// Create inserts a new article.
func (r *Repository) Create(ctx context.Context, a *blog.Article) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if a.ID == "" {
		a.ID = "bp-" + time.Now().UTC().Format("20060102150405")
	}
	a.CreatedAt = now
	a.UpdatedAt = now

	tags, _ := marshalTags(a.Tags)

	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO blog_posts (id, slug, title, excerpt, content, category, tags, image_url, cover_image_url,
		                        is_published, published_at, coach_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, NULLIF($10, '')::timestamptz, $11, $12::timestamptz, $13::timestamptz)
	`,
		a.ID, a.Slug, a.Title, a.Excerpt, a.Content, a.Category, tags, a.ImageURL,
		boolToInt(a.IsPublished), a.PublishedAt, a.AuthorID, a.CreatedAt, a.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create article: %w", err)
	}

	return r.upsertMeta(ctx, a.ID, a.ReadTimeMinutes, a.Views)
}

// Update modifies an existing article owned by the coach.
func (r *Repository) Update(ctx context.Context, a *blog.Article) error {
	a.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	tags, _ := marshalTags(a.Tags)

	res, err := r.exec.ExecContext(ctx, `
		UPDATE blog_posts
		SET slug = $1, title = $2, excerpt = $3, content = $4, category = $5, tags = $6,
		    image_url = $7, cover_image_url = $7, is_published = $8,
		    published_at = NULLIF($9, '')::timestamptz, updated_at = $10::timestamptz
		WHERE id = $11 AND coach_id = $12
	`,
		a.Slug, a.Title, a.Excerpt, a.Content, a.Category, tags, a.ImageURL,
		boolToInt(a.IsPublished), a.PublishedAt, a.UpdatedAt, a.ID, a.AuthorID,
	)
	if err != nil {
		return fmt.Errorf("failed to update article: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("article not found")
	}

	return r.upsertMeta(ctx, a.ID, a.ReadTimeMinutes, a.Views)
}

// Delete removes an article owned by the coach.
func (r *Repository) Delete(ctx context.Context, id, coachID string) error {
	_, err := r.exec.ExecContext(ctx, `DELETE FROM blog_posts WHERE id = $1 AND coach_id = $2`, id, coachID)
	return err
}

func (r *Repository) upsertMeta(ctx context.Context, postID string, readTime, views int) error {
	// Preserve the view count on edit: only read_time_minutes is updated on conflict.
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO blog_post_meta (post_id, read_time_minutes, views)
		VALUES ($1, $2, $3)
		ON CONFLICT(post_id) DO UPDATE SET read_time_minutes = excluded.read_time_minutes
	`, postID, readTime, views)
	return err
}

type scanner interface {
	Scan(dest ...any) error
}

func scanArticle(s scanner) (*blog.Article, error) {
	var a blog.Article
	var tagsJSON sql.NullString
	var publishedAt sql.NullString
	var isPublished int
	if err := s.Scan(
		&a.ID, &a.Slug, &a.Title, &a.Excerpt, &a.Content, &a.Category,
		&tagsJSON, &a.ImageURL, &isPublished, &publishedAt, &a.AuthorID,
		&a.CreatedAt, &a.UpdatedAt, &a.ReadTimeMinutes, &a.Views,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("article not found")
		}
		return nil, fmt.Errorf("failed to scan article: %w", err)
	}
	a.IsPublished = isPublished == 1
	if tagsJSON.Valid {
		_ = json.Unmarshal([]byte(tagsJSON.String), &a.Tags)
	}
	if publishedAt.Valid {
		a.PublishedAt = publishedAt.String
	}
	return &a, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// marshalTags encodes tags to a JSON array string.
func marshalTags(tags []string) (string, error) {
	if tags == nil {
		tags = []string{}
	}
	b, err := json.Marshal(tags)
	if err != nil {
		return "[]", err
	}
	return string(b), nil
}

// splitTags splits a comma-separated tags string. Kept for potential future use.
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