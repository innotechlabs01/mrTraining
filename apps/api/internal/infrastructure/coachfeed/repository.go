package coachfeed

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coachfeed"
)

// Repository implements the coachfeed.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new coach feed repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListPosts(ctx context.Context, limit int, offset int) ([]*domain.Post, error) {
	if r.db == nil {
		return []*domain.Post{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, coach_id, coach_name, content, media_type, media_url, like_count, comment_count, created_at, updated_at
		FROM coach_feed_posts
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
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
	err := r.db.QueryRowContext(ctx, `
		SELECT id, coach_id, coach_name, content, media_type, media_url, like_count, comment_count, created_at, updated_at
		FROM coach_feed_posts
		WHERE id = ?
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
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO coach_feed_posts (id, coach_id, coach_name, content, media_type, media_url, like_count, comment_count, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
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
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM coach_feed_posts WHERE id = ? AND coach_id = ?
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
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO coach_feed_reactions (id, post_id, athlete_id, type, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, reaction.ID, reaction.PostID, reaction.AthleteID, reaction.Type, now)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("add reaction: %w", err)
	}
	// Update like count
	_, _ = r.db.ExecContext(ctx, `
		UPDATE coach_feed_posts SET like_count = like_count + 1, updated_at = ? WHERE id = ?
	`, now, reaction.PostID)
	return nil
}

func (r *Repository) RemoveReaction(ctx context.Context, postID string, athleteID string) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM coach_feed_reactions WHERE post_id = ? AND athlete_id = ?
	`, postID, athleteID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("remove reaction: %w", err)
	}
	// Update like count
	now := time.Now().UTC().Format(time.RFC3339)
	_, _ = r.db.ExecContext(ctx, `
		UPDATE coach_feed_posts SET like_count = MAX(0, like_count - 1), updated_at = ? WHERE id = ?
	`, now, postID)
	return nil
}

func (r *Repository) AddComment(ctx context.Context, comment *domain.Comment) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO coach_feed_comments (id, post_id, athlete_id, athlete_name, content, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, comment.ID, comment.PostID, comment.AthleteID, comment.AthleteName, comment.Content, now)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("add comment: %w", err)
	}
	// Update comment count
	_, _ = r.db.ExecContext(ctx, `
		UPDATE coach_feed_posts SET comment_count = comment_count + 1, updated_at = ? WHERE id = ?
	`, now, comment.PostID)
	return nil
}

func (r *Repository) ListComments(ctx context.Context, postID string, limit int, offset int) ([]*domain.Comment, error) {
	if r.db == nil {
		return []*domain.Comment{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, post_id, athlete_id, athlete_name, content, created_at
		FROM coach_feed_comments
		WHERE post_id = ?
		ORDER BY created_at ASC
		LIMIT ? OFFSET ?
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
