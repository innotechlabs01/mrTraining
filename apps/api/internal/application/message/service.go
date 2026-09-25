package message

import (
	"context"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/message"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service provides messaging business logic.
type Service struct {
	repo domain.Repository
}

func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListThreads(ctx context.Context, userID string) ([]*domain.MessageThread, error) {
	threads, err := s.repo.GetThreads(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list threads: %w", err)
	}
	return threads, nil
}

func (s *Service) GetThread(ctx context.Context, threadID, userID string) (*domain.MessageThread, error) {
	thread, err := s.repo.GetThread(ctx, threadID)
	if err != nil {
		return nil, err
	}
	// verify participant
	if thread.CoachID != userID && thread.AthleteID != userID {
		return nil, errors.Forbidden("you are not a participant of this thread")
	}
	return thread, nil
}

func (s *Service) CreateThread(ctx context.Context, coachID string, req dto.CreateThreadRequest) (*domain.MessageThread, error) {
	// fetch athlete name maybe; for now just use ID
	thread := &domain.MessageThread{
		ID:          "",
		CoachID:     coachID,
		AthleteID:   req.AthleteID,
		Subject:     req.Subject,
		LastMessage: req.Content,
		LastSentAt:  "",
		UnreadCount: 1,
	}
	if err := s.repo.CreateThread(ctx, thread); err != nil {
		return nil, fmt.Errorf("create thread: %w", err)
	}
	// send first message
	msg := &domain.Message{
		ThreadID:   thread.ID,
		SenderID:   coachID,
		SenderRole: "coach",
		Content:    req.Content,
		IsRead:     false,
	}
	if err := s.repo.SendMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("send first message: %w", err)
	}
	return thread, nil
}

func (s *Service) GetThreadWithMessages(ctx context.Context, threadID, userID string) (*domain.MessageThread, []*domain.Message, error) {
	thread, err := s.GetThread(ctx, threadID, userID)
	if err != nil {
		return nil, nil, err
	}
	msgs, err := s.repo.GetMessages(ctx, thread.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("get messages: %w", err)
	}
	return thread, msgs, nil
}

func (s *Service) SendMessage(ctx context.Context, userID, role, threadID, content string) (*domain.Message, error) {
	// verify participant
	thread, err := s.repo.GetThread(ctx, threadID)
	if err != nil {
		return nil, err
	}
	if thread.CoachID != userID && thread.AthleteID != userID {
		return nil, errors.Forbidden("not a participant")
	}
	msg := &domain.Message{
		ID:         "",
		ThreadID:   threadID,
		SenderID:   userID,
		SenderRole: role,
		Content:    content,
		IsRead:     false,
	}
	if err := s.repo.SendMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("send message: %w", err)
	}
	return msg, nil
}

func (s *Service) MarkThreadRead(ctx context.Context, threadID, userID string) error {
	// verify participant
	thread, err := s.repo.GetThread(ctx, threadID)
	if err != nil {
		return err
	}
	if thread.CoachID != userID && thread.AthleteID != userID {
		return errors.Forbidden("not a participant")
	}
	return s.repo.MarkThreadRead(ctx, threadID, userID)
}