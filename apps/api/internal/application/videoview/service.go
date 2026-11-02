package videoview

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/videoview"
)

// Service handles video view business logic.
type Service struct {
	repo videoview.Repository
}

// NewService creates a new video view service.
func NewService(repo videoview.Repository) *Service {
	return &Service{repo: repo}
}

// RecordVideoView records a video view event.
func (s *Service) RecordVideoView(ctx context.Context, athleteID, exerciseID, action string, progressPct, watchDuration *int) (*videoview.VideoView, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if exerciseID == "" {
		return nil, fmt.Errorf("exercise ID is required")
	}
	if action == "" {
		return nil, fmt.Errorf("action is required (start, progress, complete)")
	}

	validActions := map[string]bool{"start": true, "progress": true, "complete": true}
	if !validActions[action] {
		return nil, fmt.Errorf("invalid action: must be start, progress, or complete")
	}

	vv := &videoview.VideoView{
		ID:            uuid.New().String(),
		AthleteID:     athleteID,
		ExerciseID:    exerciseID,
		Action:        action,
		ProgressPct:   progressPct,
		WatchDuration: watchDuration,
		CreatedAt:     uuid.New().String(),
	}

	if err := s.repo.RecordVideoView(ctx, vv); err != nil {
		return nil, err
	}
	return vv, nil
}

// ListVideoViews returns video views for an athlete, optionally filtered by exercise.
func (s *Service) ListVideoViews(ctx context.Context, athleteID, exerciseID string) ([]*videoview.VideoView, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListVideoViews(ctx, athleteID, exerciseID)
}