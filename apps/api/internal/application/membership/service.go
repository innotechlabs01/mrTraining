// Package membership provides the application service layer for the membership domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package membership

import (
	"context"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

const defaultGracePeriodDays = 5

// Service implements membership-related business operations.
// It depends on the membership.Repository interface, making it testable with mocks.
type Service struct {
	repo domain.Repository
}

// NewService creates a new membership application service with the given repository.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// GetMembership returns the athlete's current membership.
// Recalculates status based on dates before returning.
func (s *Service) GetMembership(ctx context.Context, athleteID string) (*domain.Membership, error) {
	m, err := s.repo.GetByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("get membership: %w", err)
	}

	m.RecalculateStatus()
	return m, nil
}

// CreateRequest holds the parameters for creating a new membership.
type CreateRequest struct {
	AthleteID     string
	CoachID       string
	PlanName      string
	PlanPrice     float64
	BillingPeriod string  // "monthly" or "yearly", defaults to "monthly"
	StartDate     string  // ISO date, defaults to today
}

// CreateMembership creates a new membership with an initial "active" status
// and computes the first billing period.
func (s *Service) CreateMembership(ctx context.Context, req CreateRequest) (*domain.Membership, error) {
	if req.AthleteID == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}
	if req.CoachID == "" {
		return nil, errors.BadRequest("coach_id is required")
	}
	if req.PlanName == "" {
		return nil, errors.BadRequest("plan_name is required")
	}
	if req.BillingPeriod == "" {
		req.BillingPeriod = "monthly"
	}

	startDate := req.StartDate
	if startDate == "" {
		startDate = time.Now().UTC().Format("2006-01-02")
	}

	periodEnd := computePeriodEnd(startDate, req.BillingPeriod)
	paymentDueDate := computePaymentDueDate(periodEnd, defaultGracePeriodDays)

	m := &domain.Membership{
		ID:                 generateID(),
		AthleteID:          req.AthleteID,
		CoachID:            req.CoachID,
		PlanName:           req.PlanName,
		PlanPrice:          req.PlanPrice,
		BillingPeriod:      req.BillingPeriod,
		Status:             "active",
		CurrentPeriodStart: startDate,
		CurrentPeriodEnd:   periodEnd,
		GracePeriodDays:    defaultGracePeriodDays,
		PaymentDueDate:     paymentDueDate,
	}

	if err := s.repo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("create membership: %w", err)
	}

	return m, nil
}

// CancelMembership sets the membership status to "cancelled".
func (s *Service) CancelMembership(ctx context.Context, id string) error {
	if id == "" {
		return errors.BadRequest("membership ID is required")
	}

	if err := s.repo.Cancel(ctx, id); err != nil {
		return fmt.Errorf("cancel membership: %w", err)
	}

	return nil
}

// RenewMembership extends the membership period by one billing cycle.
func (s *Service) RenewMembership(ctx context.Context, id string) error {
	if id == "" {
		return errors.BadRequest("membership ID is required")
	}

	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get membership for renewal: %w", err)
	}

	newPeriodStart := m.CurrentPeriodEnd
	newPeriodEnd := computePeriodEnd(newPeriodStart, m.BillingPeriod)
	newPaymentDueDate := computePaymentDueDate(newPeriodEnd, m.GracePeriodDays)

	m.CurrentPeriodStart = newPeriodStart
	m.CurrentPeriodEnd = newPeriodEnd
	m.PaymentDueDate = newPaymentDueDate
	m.Status = "active"

	if err := s.repo.Update(ctx, m); err != nil {
		return fmt.Errorf("renew membership: %w", err)
	}

	return nil
}

// GetPaymentHistory returns the payment records for an athlete.
func (s *Service) GetPaymentHistory(ctx context.Context, athleteID string) ([]*domain.Payment, error) {
	payments, err := s.repo.GetPaymentHistory(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("get payment history: %w", err)
	}

	return payments, nil
}

// ListMembershipsByCoach returns all memberships for athletes of a specific coach.
func (s *Service) ListMembershipsByCoach(ctx context.Context, coachID string) ([]*domain.Membership, error) {
	memberships, err := s.repo.ListByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list memberships by coach: %w", err)
	}

	// Recalculate status for each membership
	for _, m := range memberships {
		m.RecalculateStatus()
	}

	return memberships, nil
}

// computePeriodEnd calculates the end of a billing period from a start date.
func computePeriodEnd(startDate, billingPeriod string) string {
	t, _ := time.Parse("2006-01-02", startDate)
	if billingPeriod == "yearly" {
		t = t.AddDate(1, 0, 0)
	} else {
		t = t.AddDate(0, 1, 0)
	}
	return t.Format("2006-01-02")
}

// computePaymentDueDate calculates the payment due date from a period end date
// and grace period days.
func computePaymentDueDate(periodEnd string, graceDays int) string {
	t, _ := time.Parse("2006-01-02", periodEnd)
	t = t.AddDate(0, 0, graceDays)
	return t.Format("2006-01-02")
}

// generateID creates a new unique identifier. Uses the same approach as the
// TypeScript codebase (nanoid-style).
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
