package community

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/community"
)

// Repository implements the community.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new community repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListPosts returns legacy posts (stub to satisfy interface).
func (r *Repository) ListPosts(ctx context.Context, coachID string) ([]*community.Post, error) {
	if r.db == nil {
		return []*community.Post{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `SELECT id, author_id, content FROM community_posts WHERE author_id = ? ORDER BY id DESC`, coachID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*community.Post{}, nil
		}
		return nil, fmt.Errorf("failed to list posts: %w", err)
	}
	defer rows.Close()
	var posts []*community.Post
	for rows.Next() {
		var p community.Post
		if err := rows.Scan(&p.ID, &p.AuthorID, &p.Content); err != nil {
			return nil, fmt.Errorf("failed to scan post: %w", err)
		}
		posts = append(posts, &p)
	}
	if posts == nil {
		posts = []*community.Post{}
	}
	return posts, nil
}

// CreatePost inserts a legacy post.
func (r *Repository) CreatePost(ctx context.Context, post *community.Post) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `INSERT INTO community_posts (id, author_id, content) VALUES (?, ?, ?)`, post.ID, post.AuthorID, post.Content)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to create post: %w", err)
	}
	return nil
}

// ListForums returns all forum topics.
func (r *Repository) ListForums(ctx context.Context) ([]*community.ForumTopic, error) {
	if r.db == nil {
		return []*community.ForumTopic{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, description, category
		FROM community_forums
		ORDER BY title ASC
	`)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*community.ForumTopic{}, nil
		}
		return nil, fmt.Errorf("failed to list forums: %w", err)
	}
	defer rows.Close()

	var forums []*community.ForumTopic
	for rows.Next() {
		var f community.ForumTopic
		var desc, cat sql.NullString
		if err := rows.Scan(&f.ID, &f.Title, &desc, &cat); err != nil {
			return nil, fmt.Errorf("failed to scan forum: %w", err)
		}
		if desc.Valid {
			f.Description = desc.String
		}
		if cat.Valid {
			f.Category = cat.String
		}
		forums = append(forums, &f)
	}
	if forums == nil {
		forums = []*community.ForumTopic{}
	}
	return forums, nil
}

// ListChallenges returns all challenges.
func (r *Repository) ListChallenges(ctx context.Context) ([]*community.Challenge, error) {
	if r.db == nil {
		return []*community.Challenge{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, description, duration_minutes, calories, participants_count
		FROM community_challenges
		ORDER BY title ASC
	`)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*community.Challenge{}, nil
		}
		return nil, fmt.Errorf("failed to list challenges: %w", err)
	}
	defer rows.Close()

	var challenges []*community.Challenge
	for rows.Next() {
		var c community.Challenge
		var desc sql.NullString
		var durationMinutes, calories, participantsCount sql.NullInt64
		if err := rows.Scan(&c.ID, &c.Title, &desc, &durationMinutes, &calories, &participantsCount); err != nil {
			return nil, fmt.Errorf("failed to scan challenge: %w", err)
		}
		if desc.Valid {
			c.Description = desc.String
		}
		if durationMinutes.Valid {
			c.DurationMinutes = int(durationMinutes.Int64)
		}
		if calories.Valid {
			c.Calories = int(calories.Int64)
		}
		if participantsCount.Valid {
			c.ParticipantsCount = int(participantsCount.Int64)
		}
		challenges = append(challenges, &c)
	}
	if challenges == nil {
		challenges = []*community.Challenge{}
	}
	return challenges, nil
}

// ListMessages returns messages for a forum.
func (r *Repository) ListMessages(ctx context.Context, forumID string) ([]*community.Message, error) {
	if r.db == nil {
		return []*community.Message{}, nil
	}
	if strings.TrimSpace(forumID) == "" {
		forumID = "default"
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, forum_id, user_id, user_name, message, created_at
		FROM community_messages
		WHERE forum_id = ?
		ORDER BY created_at ASC
	`, forumID)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*community.Message{}, nil
		}
		return nil, fmt.Errorf("failed to list messages: %w", err)
	}
	defer rows.Close()

	var messages []*community.Message
	for rows.Next() {
		var m community.Message
		var userName, createdAt sql.NullString
		if err := rows.Scan(&m.ID, &m.ForumID, &m.UserID, &userName, &m.Message, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		if userName.Valid {
			m.UserName = userName.String
		}
		if createdAt.Valid {
			m.CreatedAt = createdAt.String
		}
		messages = append(messages, &m)
	}
	if messages == nil {
		messages = []*community.Message{}
	}
	return messages, nil
}

// CreateMessage inserts a new forum message.
func (r *Repository) CreateMessage(ctx context.Context, msg *community.Message) error {
	if r.db == nil {
		return fmt.Errorf("database not configured")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO community_messages (id, forum_id, user_id, user_name, message, created_at)
		VALUES (?, ?, ?, ?, ?, datetime('now'))
	`, msg.ID, msg.ForumID, msg.UserID, msg.UserName, msg.Message)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("failed to create message: %w", err)
	}
	return nil
}
