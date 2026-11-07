package coachfeed

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coachfeed"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements the coachfeed.Repository interface using libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new coach feed repository.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{
		db:  r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

func (r *Repository) ListPosts(ctx context.Context, limit int, offset int) ([]*domain.Post, error) {
	if r.db == nil {
		return []*domain.Post{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, coach_id, coach_name, content, media_type, media_url, like_count, comment_count, created_at, updated_at
		FROM coach_feed_posts
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*domain.Post{}, nil
		}
		return nil, fmt.Errorf("list posts: %w", err)
	}
	defer rows.Close()

	var posts []*domain.Post
	for rows.Next() {
		p := &domain.Post{}
		if err := rows.Scan(&p.ID, &p.CoachID, &p.CoachName, &p.Content, &p.MediaType, &p.MediaURL, &p.LikeCount, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		posts = append(posts, p)
	}
	if posts == nil {
		posts = []*domain.Post{}
	}
	return posts, nil
}

func (r *Repository) GetPost(ctx context.Context, postID string) (*domain.Post, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database not configured")
	}
	p := &domain.Post{}
	err := r.exec.QueryRowContext(ctx, `
		SELECT id, coach_id, coach_name, content, media_type, media_url, like_count, comment_count, created_at, updated_at
		FROM coach_feed_posts
		WHERE id = $1
	`, postID).Scan(&p.ID, &p.CoachID, &p.CoachName, &p.Content, &p.MediaType, &p.MediaURL, &p.LikeCount, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil, fmt.Errorf("coach feed not available")
		}
		return nil, fmt.Errorf("get post: %w", err)
	}
	return p, nil
}

func (r *Repository) CreatePost(ctx context.Context, post *domain.Post) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO coach_feed_posts (id, coach_id, coach_name, content, media_type, media_url, like_count, comment_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7, $8)
	`, post.ID, post.CoachID, post.CoachName, post.Content, post.MediaType, post.MediaURL, now, now)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("create post: %w", err)
	}
	return nil
}

func (r *Repository) DeletePost(ctx context.Context, postID string, coachID string) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.exec.ExecContext(ctx, `
		DELETE FROM coach_feed_posts WHERE id = $1 AND coach_id = $2
	`, postID, coachID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("delete post: %w", err)
	}
	return nil
}

func (r *Repository) AddReaction(ctx context.Context, reaction *domain.Reaction) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO coach_feed_reactions (id, post_id, athlete_id, type, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, reaction.ID, reaction.PostID, reaction.AthleteID, reaction.Type, now)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("add reaction: %w", err)
	}
	// Update like count
	_, _ = r.exec.ExecContext(ctx, `
		UPDATE coach_feed_posts SET like_count = like_count + 1, updated_at = $1 WHERE id = $2
	`, now, reaction.PostID)
	return nil
}

func (r *Repository) RemoveReaction(ctx context.Context, postID string, athleteID string) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.exec.ExecContext(ctx, `
		DELETE FROM coach_feed_reactions WHERE post_id = $1 AND athlete_id = $2
	`, postID, athleteID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("remove reaction: %w", err)
	}
	// Update like count
	now := time.Now().UTC().Format(time.RFC3339)
	_, _ = r.exec.ExecContext(ctx, `
		UPDATE coach_feed_posts SET like_count = MAX(0, like_count - 1), updated_at = $1 WHERE id = $2
	`, now, postID)
	return nil
}

func (r *Repository) AddComment(ctx context.Context, comment *domain.Comment) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO coach_feed_comments (id, post_id, athlete_id, athlete_name, content, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, comment.ID, comment.PostID, comment.AthleteID, comment.AthleteName, comment.Content, now)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("add comment: %w", err)
	}
	// Update comment count
	_, _ = r.exec.ExecContext(ctx, `
		UPDATE coach_feed_posts SET comment_count = comment_count + 1, updated_at = $1 WHERE id = $2
	`, now, comment.PostID)
	return nil
}

func (r *Repository) ListComments(ctx context.Context, postID string, limit int, offset int) ([]*domain.Comment, error) {
	if r.db == nil {
		return []*domain.Comment{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, post_id, athlete_id, athlete_name, content, created_at
		FROM coach_feed_comments
		WHERE post_id = $1
		ORDER BY created_at ASC
		LIMIT $2 OFFSET $3
	`, postID, limit, offset)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*domain.Comment{}, nil
		}
		return nil, fmt.Errorf("list comments: %w", err)
	}
	defer rows.Close()

	var comments []*domain.Comment
	for rows.Next() {
		c := &domain.Comment{}
		if err := rows.Scan(&c.ID, &c.PostID, &c.AthleteID, &c.AthleteName, &c.Content, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		comments = append(comments, c)
	}
	if comments == nil {
		comments = []*domain.Comment{}
	}
	return comments, nil
}
