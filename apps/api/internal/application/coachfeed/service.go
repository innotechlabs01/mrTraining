package coachfeed

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coachfeed"
)

// Service implements the coach feed business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new coach feed service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// ListPosts returns paginated posts.
func (s *Service) ListPosts(ctx context.Context, limit int, offset int) ([]*domain.Post, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListPosts(ctx, limit, offset)
}

// GetPost returns a single post.
func (s *Service) GetPost(ctx context.Context, postID string) (*domain.Post, error) {
	return s.repo.GetPost(ctx, postID)
}

// CreatePost creates a new post (coach only).
func (s *Service) CreatePost(ctx context.Context, coachID string, coachName string, content string, mediaType string, mediaURL string) (*domain.Post, error) {
	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("content is required")
	}
	post := &domain.Post{
		ID:        uuid.New().String(),
		CoachID:   coachID,
		CoachName: coachName,
		Content:   strings.TrimSpace(content),
		MediaType: mediaType,
		MediaURL:  mediaURL,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if err := s.repo.CreatePost(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

// DeletePost deletes a post (coach only).
func (s *Service) DeletePost(ctx context.Context, postID string, coachID string) error {
	return s.repo.DeletePost(ctx, postID, coachID)
}

// AddReaction adds a like/reaction to a post.
func (s *Service) AddReaction(ctx context.Context, postID string, athleteID string, reactionType string) error {
	if reactionType == "" {
		reactionType = "like"
	}
	reaction := &domain.Reaction{
		ID:        uuid.New().String(),
		PostID:    postID,
		AthleteID: athleteID,
		Type:      reactionType,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	return s.repo.AddReaction(ctx, reaction)
}

// RemoveReaction removes a reaction from a post.
func (s *Service) RemoveReaction(ctx context.Context, postID string, athleteID string) error {
	return s.repo.RemoveReaction(ctx, postID, athleteID)
}

// AddComment adds a comment to a post.
func (s *Service) AddComment(ctx context.Context, postID string, athleteID string, athleteName string, content string) (*domain.Comment, error) {
	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("content is required")
	}
	comment := &domain.Comment{
		ID:          uuid.New().String(),
		PostID:      postID,
		AthleteID:   athleteID,
		AthleteName: athleteName,
		Content:     strings.TrimSpace(content),
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	if err := s.repo.AddComment(ctx, comment); err != nil {
		return nil, err
	}
	return comment, nil
}

// ListComments returns paginated comments for a post.
func (s *Service) ListComments(ctx context.Context, postID string, limit int, offset int) ([]*domain.Comment, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListComments(ctx, postID, limit, offset)
}
