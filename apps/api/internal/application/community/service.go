package community

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/community"
)

// Service handles community business logic.
type Service struct {
	repo community.Repository
}

// NewService creates a new community service.
func NewService(repo community.Repository) *Service {
	return &Service{repo: repo}
}

// GetCommunity returns forums and challenges aggregated for the athlete community view.
func (s *Service) GetCommunity(ctx context.Context) ([]*community.ForumTopic, []*community.Challenge, error) {
	forums, err := s.repo.ListForums(ctx)
	if err != nil {
		return nil, nil, err
	}
	challenges, err := s.repo.ListChallenges(ctx)
	if err != nil {
		return nil, nil, err
	}
	if forums == nil {
		forums = []*community.ForumTopic{}
	}
	if challenges == nil {
		challenges = []*community.Challenge{}
	}
	return forums, challenges, nil
}

// ListForums returns all forum topics.
func (s *Service) ListForums(ctx context.Context) ([]*community.ForumTopic, error) {
	return s.repo.ListForums(ctx)
}

// ListChallenges returns all challenges.
func (s *Service) ListChallenges(ctx context.Context) ([]*community.Challenge, error) {
	return s.repo.ListChallenges(ctx)
}

// ListMessages returns messages for a forum.
func (s *Service) ListMessages(ctx context.Context, forumID string) ([]*community.Message, error) {
	if strings.TrimSpace(forumID) == "" {
		forumID = "default"
	}
	msgs, err := s.repo.ListMessages(ctx, forumID)
	if err != nil {
		return nil, err
	}
	if msgs == nil {
		msgs = []*community.Message{}
	}
	return msgs, nil
}

// CreateMessage creates a new forum message.
func (s *Service) CreateMessage(ctx context.Context, forumID, userID, userName, message string) (*community.Message, error) {
	if strings.TrimSpace(forumID) == "" {
		return nil, fmt.Errorf("forum ID is required")
	}
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user ID is required")
	}
	if strings.TrimSpace(message) == "" {
		return nil, fmt.Errorf("message is required")
	}
	if strings.TrimSpace(userName) == "" {
		userName = userID
	}

	msg := &community.Message{
		ID:        uuid.New().String(),
		ForumID:   forumID,
		UserID:    userID,
		UserName:  userName,
		Message:   strings.TrimSpace(message),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}
