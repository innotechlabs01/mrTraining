// Package plan provides application logic for coach plans.
package plan

import (
	"context"
	"fmt"

	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	"github.com/google/uuid"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service provides plan business logic.
type Service struct {
	repo plandomain.Repository
}

// NewService creates a new plan service.
func NewService(repo plandomain.Repository) *Service {
	return &Service{repo: repo}
}

// ListPlans returns plans for a coach. When activeOnly is true only published plans.
func (s *Service) ListPlans(ctx context.Context, coachID string, activeOnly bool) ([]*plandomain.Plan, error) {
	return s.repo.ListByCoach(ctx, coachID, activeOnly)
}

// CreatePlan creates a new plan for the given coach.
func (s *Service) CreatePlan(ctx context.Context, coachID string, req dto.CreatePlanRequest) (*plandomain.Plan, error) {
	if req.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}
	if req.Price <= 0 {
		return nil, apperrors.BadRequest("price must be greater than 0")
	}
	if req.Currency == "" {
		req.Currency = "COP"
	}
	if req.Currency != "COP" && req.Currency != "USD" {
		return nil, apperrors.BadRequest("currency must be COP or USD")
	}
	if req.BillingPeriod == "" {
		req.BillingPeriod = "monthly"
	}

	p := &plandomain.Plan{
		ID:                 uuid.New().String(),
		Name:               req.Name,
		Description:        req.Description,
		Price:              req.Price,
		Currency:           req.Currency,
		BillingPeriod:      req.BillingPeriod,
		MaxAthletes:        req.MaxAthletes,
		MaxSessionsPerWeek: req.MaxSessionsPerWeek,
		IsActive:           req.IsActive,
		CoachID:            coachID,
		TRM:                req.TRM,
		DiscountType:       req.DiscountType,
		DiscountValue:      req.DiscountValue,
		DiscountLabel:      req.DiscountLabel,
		DiscountValidFrom:  req.DiscountValidFrom,
		DiscountValidUntil: req.DiscountValidUntil,
		DiscountCode:       req.DiscountCode,
	}
	if p.MaxAthletes == 0 {
		p.MaxAthletes = 10
	}
	if p.MaxSessionsPerWeek == 0 {
		p.MaxSessionsPerWeek = 12
	}

	if err := s.repo.Create(ctx, p); err != nil {
		return nil, fmt.Errorf("create plan: %w", err)
	}
	return p, nil
}

// UpdatePlan updates an existing plan. Only the owning coach can update.
func (s *Service) UpdatePlan(ctx context.Context, coachID, id string, req dto.UpdatePlanRequest) (*plandomain.Plan, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.CoachID != coachID {
		return nil, apperrors.Forbidden("you can only update your own plans")
	}

	if req.Name != nil && *req.Name != "" {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.Price != nil && *req.Price > 0 {
		existing.Price = *req.Price
	}
	if req.Currency != nil && (*req.Currency == "COP" || *req.Currency == "USD") {
		existing.Currency = *req.Currency
	}
	if req.BillingPeriod != nil && *req.BillingPeriod != "" {
		existing.BillingPeriod = *req.BillingPeriod
	}
	if req.MaxAthletes != nil && *req.MaxAthletes > 0 {
		existing.MaxAthletes = *req.MaxAthletes
	}
	if req.MaxSessionsPerWeek != nil && *req.MaxSessionsPerWeek > 0 {
		existing.MaxSessionsPerWeek = *req.MaxSessionsPerWeek
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	if req.TRM != nil {
		existing.TRM = *req.TRM
	}
	if req.DiscountType != nil {
		existing.DiscountType = *req.DiscountType
	}
	if req.DiscountValue != nil {
		existing.DiscountValue = *req.DiscountValue
	}
	if req.DiscountLabel != nil {
		existing.DiscountLabel = *req.DiscountLabel
	}
	if req.DiscountValidFrom != nil {
		existing.DiscountValidFrom = *req.DiscountValidFrom
	}
	if req.DiscountValidUntil != nil {
		existing.DiscountValidUntil = *req.DiscountValidUntil
	}
	if req.DiscountCode != nil {
		existing.DiscountCode = *req.DiscountCode
	}

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("update plan: %w", err)
	}
	return existing, nil
}

// DeletePlan removes a plan. Only the owning coach can delete.
func (s *Service) DeletePlan(ctx context.Context, coachID, id string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing.CoachID != coachID {
		return apperrors.Forbidden("you can only delete your own plans")
	}
	return s.repo.Delete(ctx, id)
}
