// Package message provides the application service layer for the message domain.
package message

import (
	"context"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/message"
)

// Service implements message-related business operations.
type Service struct {
	repo message.Repository
}

// NewService creates a new message application service.
func NewService(repo message.Repository) *Service {
	return &Service{repo: repo}
}

// GetThreads returns all message threads for a user.
func (s *Service) GetThreads(ctx context.Context, userID string) ([]*message.MessageThread, error) {
	threads, err := s.repo.GetThreads(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get threads: %w", err)
	}
	return threads, nil
}

// GetThread returns a single thread with its messages.
func (s *Service) GetThread(ctx context.Context, threadID, userID string) (*message.MessageThread, []*message.Message, error) {
	thread, err := s.repo.GetThread(ctx, threadID)
	if err != nil {
		return nil, nil, fmt.Errorf("get thread: %w", err)
	}

	// Verify user is part of this thread
	if thread.CoachID != userID && thread.AthleteID != userID {
		return nil, nil, fmt.Errorf("access denied")
	}

	messages, err := s.repo.GetMessages(ctx, threadID)
	if err != nil {
		return nil, nil, fmt.Errorf("get messages: %w", err)
	}

	return thread, messages, nil
}

// CreateThread creates a new message thread.
func (s *Service) CreateThread(ctx context.Context, thread *message.MessageThread) error {
	if strings.TrimSpace(thread.CoachID) == "" {
		return fmt.Errorf("coach_id is required")
	}
	if strings.TrimSpace(thread.AthleteID) == "" {
		return fmt.Errorf("athlete_id is required")
	}

	if err := s.repo.CreateThread(ctx, thread); err != nil {
		return fmt.Errorf("create thread: %w", err)
	}
	return nil
}

// SendMessage sends a message in a thread.
func (s *Service) SendMessage(ctx context.Context, threadID, senderID, senderRole, content string) (*message.Message, error) {
	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("message content is required")
	}
	if strings.TrimSpace(senderID) == "" {
		return nil, fmt.Errorf("sender_id is required")
	}

	// Verify thread exists and user is part of it
	thread, err := s.repo.GetThread(ctx, threadID)
	if err != nil {
		return nil, fmt.Errorf("get thread: %w", err)
	}
	if thread.CoachID != senderID && thread.AthleteID != senderID {
		return nil, fmt.Errorf("access denied")
	}

	msg := &message.Message{
		ThreadID:   threadID,
		SenderID:   senderID,
		SenderRole: senderRole,
		Content:    content,
	}

	if err := s.repo.SendMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("send message: %w", err)
	}

	return msg, nil
}

// MarkRead marks all messages in a thread as read for a user.
func (s *Service) MarkRead(ctx context.Context, threadID, userID string) error {
	if err := s.repo.MarkThreadRead(ctx, threadID, userID); err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}
