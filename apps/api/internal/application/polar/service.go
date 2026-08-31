package polar

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/polar"
)

// Service handles Polar checkout business logic.
type Service struct {
	repo polar.Repository
}

// NewService creates a new polar service.
func NewService(repo polar.Repository) *Service {
	return &Service{repo: repo}
}

// CreateCheckout creates a new Polar checkout session for a membership.
func (s *Service) CreateCheckout(ctx context.Context, athleteID, membershipID string) (*polar.PolarCheckout, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if membershipID == "" {
		return nil, fmt.Errorf("membership ID is required")
	}

	// In a real implementation, this would call Polar API to create a checkout
	// For now, we create a placeholder checkout with a mock URL
	checkout := &polar.PolarCheckout{
		ID:           uuid.New().String(),
		MembershipID: membershipID,
		AthleteID:    athleteID,
		PolarOrderID: "polar_" + uuid.New().String()[:8],
		CheckoutURL:  "https://polar.sh/checkout/mock_" + uuid.New().String()[:8],
		Status:       "pending",
		AmountCents:  2999, // $29.99 placeholder
		Currency:     "USD",
		CreatedAt:    uuid.New().String(), // placeholder timestamp
	}

	if err := s.repo.CreateCheckout(ctx, checkout); err != nil {
		return nil, err
	}
	return checkout, nil
}

// GetCheckout returns a checkout by ID.
func (s *Service) GetCheckout(ctx context.Context, id string) (*polar.PolarCheckout, error) {
	if id == "" {
		return nil, fmt.Errorf("checkout ID is required")
	}
	return s.repo.GetCheckout(ctx, id)
}

// UpdateCheckoutStatus updates the status of a checkout (called from webhook).
func (s *Service) UpdateCheckoutStatus(ctx context.Context, id, status string) error {
	if id == "" {
		return fmt.Errorf("checkout ID is required")
	}
	if status == "" {
		return fmt.Errorf("status is required")
	}
	return s.repo.UpdateCheckoutStatus(ctx, id, status)
}