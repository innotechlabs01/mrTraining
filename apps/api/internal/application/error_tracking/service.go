// Package error_tracking provides the application service layer for error tracking.
// It orchestrates saving errors to the database and sending them to Discord.
package error_tracking

import (
	"context"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/error_tracking"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

// Service orchestrates error tracking use cases: create, list, resolve.
type Service struct {
	repo       domain.Repository
	discord    *error_tracking.DiscordSender
	superAdmin string // Clerk user ID of super admin (for resolved_by default)
	outbox     eventbus.OutboxWriter
}

// NewService creates a new error tracking application service.
func NewService(repo domain.Repository, discord *error_tracking.DiscordSender, superAdminClerkID string) *Service {
	return &Service{
		repo:       repo,
		discord:    discord,
		superAdmin: superAdminClerkID,
	}
}

// WithOutbox configures transactional/outbox async delivery for Discord notifications.
func (s *Service) WithOutbox(outbox eventbus.OutboxWriter) *Service {
	s.outbox = outbox
	return s
}

// CreateError creates a new error record and delivers Discord alert asynchronously.
func (s *Service) CreateError(ctx context.Context, in domain.CreateErrorInput) (*domain.Error, error) {
	if err := in.Validate(); err != nil {
		return nil, errors.BadRequest(err.Error())
	}

	e := &domain.Error{
		Title:       in.Title,
		Description: in.Description,
		Source:      in.Source,
		Severity:    in.Severity,
		Status:      domain.StatusOpen,
	}

	created, err := s.repo.Create(ctx, e)
	if err != nil {
		return nil, fmt.Errorf("create error record: %w", err)
	}

	if s.outbox != nil {
		ev := eventbus.NewEvent(ctx, eventbus.SubjectErrorReported, "error", created.ID, map[string]interface{}{
			"id":          created.ID,
			"title":       created.Title,
			"description": created.Description,
			"source":      created.Source,
			"severity":    created.Severity,
			"status":      created.Status,
		})
		_ = s.outbox.Insert(ctx, nil, ev)
	} else if s.discord != nil {
		// Bounded non-blocking fallback when outbox isn't configured.
		asyncCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		go func() {
			defer cancel()
			_, _, _ = s.discord.Send(asyncCtx, created)
		}()
	}

	return created, nil
}

// ListErrors returns error records with optional filters.
func (s *Service) ListErrors(ctx context.Context, status, severity, source string, limit, offset int) ([]*domain.Error, int, error) {
	return s.repo.List(ctx, status, severity, source, limit, offset)
}

// ResolveError marks an error as resolved or ignored.
func (s *Service) ResolveError(ctx context.Context, id, resolvedBy, note, status string) (*domain.Error, error) {
	if err := func() error {
		input := domain.ResolveErrorInput{
			Status: status,
			Note:   note,
		}
		return input.Validate()
	}(); err != nil {
		return nil, errors.BadRequest(err.Error())
	}
	if resolvedBy == "" {
		resolvedBy = s.superAdmin
	}
	return s.repo.Resolve(ctx, id, resolvedBy, note, status)
}

// GetError returns a single error record by ID.
func (s *Service) GetError(ctx context.Context, id string) (*domain.Error, error) {
	return s.repo.GetByID(ctx, id)
}

// CountByStatus returns error counts grouped by status.
func (s *Service) CountByStatus(ctx context.Context) (map[string]int, error) {
	return s.repo.CountByStatus(ctx)
}

// CountBySeverity returns error counts grouped by severity.
func (s *Service) CountBySeverity(ctx context.Context) (map[string]int, error) {
	return s.repo.CountBySeverity(ctx)
}
