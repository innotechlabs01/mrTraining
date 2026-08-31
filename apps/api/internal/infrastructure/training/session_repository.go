// Package training provides infrastructure implementations for the training domain.
package training

import (
	"context"
	"sync"

	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
)

// TrainingSessionRepository is a minimal in-memory implementation of
// training.TrainingSessionRepository.
//
// It is a stopgap so the training-session endpoints can be registered and tested
// before a persistence-backed implementation is introduced. Data is not durable.
type TrainingSessionRepository struct {
	mu       sync.Mutex
	sessions []*training.TrainingSession
}

// NewTrainingSessionRepository creates a new in-memory training session repository.
func NewTrainingSessionRepository() *TrainingSessionRepository {
	return &TrainingSessionRepository{sessions: make([]*training.TrainingSession, 0)}
}

// Create appends a training session to the in-memory store.
func (r *TrainingSessionRepository) Create(ctx context.Context, session *training.TrainingSession) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sessions = append(r.sessions, session)
	return nil
}

// List returns training sessions filtered by coach and/or athlete.
func (r *TrainingSessionRepository) List(ctx context.Context, coachID, athleteID string) ([]*training.TrainingSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	out := make([]*training.TrainingSession, 0, len(r.sessions))
	for _, s := range r.sessions {
		if coachID != "" && s.CoachID != coachID {
			continue
		}
		if athleteID != "" && s.AthleteID != athleteID {
			continue
		}
		out = append(out, s)
	}
	return out, nil
}
