// Package ally_catalog holds the application logic for the ally catalog
// (products and services).
package ally_catalog

import (
	"context"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	allycatalogdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_catalog"
)

// Service handles ally catalog business logic.
type Service struct {
	repo allycatalogdomain.Repository
}

// NewService creates a new ally catalog service.
func NewService(repo allycatalogdomain.Repository) *Service {
	return &Service{repo: repo}
}

// ListProducts returns every product of the ally the user owns or belongs to.
func (s *Service) ListProducts(ctx context.Context, userID string, activeOnly bool) ([]*allycatalogdomain.AllyProduct, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListProducts(ctx, allyID, activeOnly)
}

// CreateProduct registers a new product for the ally the user owns or belongs to.
func (s *Service) CreateProduct(ctx context.Context, userID string, in allycatalogdomain.CreateProductInput) (*allycatalogdomain.AllyProduct, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	if in.Name == "" {
		return nil, apperrors.BadRequest("product name is required")
	}
	if in.PriceCents < 0 {
		return nil, apperrors.BadRequest("price_cents must be non-negative")
	}
	if in.Stock < 0 {
		return nil, apperrors.BadRequest("stock must be non-negative")
	}
	if in.Currency == "" {
		in.Currency = "COP"
	}

	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	in.AllyID = allyID
	return s.repo.CreateProduct(ctx, in)
}

// GetProduct returns a product only when it belongs to the ally of the user.
func (s *Service) GetProduct(ctx context.Context, userID, productID string) (*allycatalogdomain.AllyProduct, error) {
	if userID == "" || productID == "" {
		return nil, apperrors.BadRequest("user ID and product ID are required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetProduct(ctx, allyID, productID)
}

// UpdateProduct updates a product only when it belongs to the ally of the user.
func (s *Service) UpdateProduct(ctx context.Context, userID, productID string, in allycatalogdomain.UpdateProductInput) (*allycatalogdomain.AllyProduct, error) {
	if userID == "" || productID == "" {
		return nil, apperrors.BadRequest("user ID and product ID are required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if in.PriceCents != nil && *in.PriceCents < 0 {
		return nil, apperrors.BadRequest("price_cents must be non-negative")
	}
	if in.Stock != nil && *in.Stock < 0 {
		return nil, apperrors.BadRequest("stock must be non-negative")
	}
	return s.repo.UpdateProduct(ctx, allyID, productID, in)
}

// ListServices returns every service of the ally the user owns or belongs to.
func (s *Service) ListServices(ctx context.Context, userID string, activeOnly bool) ([]*allycatalogdomain.AllyService, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListServices(ctx, allyID, activeOnly)
}

// ListProductsByCoach returns every active product of the ally owned by the
// given coach. Used so athletes can browse their linked coach's catalog.
func (s *Service) ListProductsByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*allycatalogdomain.AllyProduct, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	allyID, err := s.repo.ResolveAllyIDByCoachID(ctx, coachID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListProducts(ctx, allyID, activeOnly)
}

// ListServicesByCoach returns every active service of the ally owned by the
// given coach. Used so athletes can browse their linked coach's catalog.
func (s *Service) ListServicesByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*allycatalogdomain.AllyService, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	allyID, err := s.repo.ResolveAllyIDByCoachID(ctx, coachID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListServices(ctx, allyID, activeOnly)
}

// CreateService registers a new service for the ally the user owns or belongs to.
func (s *Service) CreateService(ctx context.Context, userID string, in allycatalogdomain.CreateServiceInput) (*allycatalogdomain.AllyService, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	if in.Name == "" {
		return nil, apperrors.BadRequest("service name is required")
	}
	if in.PriceCents < 0 {
		return nil, apperrors.BadRequest("price_cents must be non-negative")
	}
	if in.DurationMin < 0 {
		return nil, apperrors.BadRequest("duration_min must be non-negative")
	}
	if in.Capacity < 1 {
		return nil, apperrors.BadRequest("capacity must be at least 1")
	}
	if in.Currency == "" {
		in.Currency = "COP"
	}

	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	in.AllyID = allyID
	return s.repo.CreateService(ctx, in)
}

// GetService returns a service only when it belongs to the ally of the user.
func (s *Service) GetService(ctx context.Context, userID, serviceID string) (*allycatalogdomain.AllyService, error) {
	if userID == "" || serviceID == "" {
		return nil, apperrors.BadRequest("user ID and service ID are required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetService(ctx, allyID, serviceID)
}

// UpdateService updates a service only when it belongs to the ally of the user.
func (s *Service) UpdateService(ctx context.Context, userID, serviceID string, in allycatalogdomain.UpdateServiceInput) (*allycatalogdomain.AllyService, error) {
	if userID == "" || serviceID == "" {
		return nil, apperrors.BadRequest("user ID and service ID are required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if in.PriceCents != nil && *in.PriceCents < 0 {
		return nil, apperrors.BadRequest("price_cents must be non-negative")
	}
	if in.DurationMin != nil && *in.DurationMin < 0 {
		return nil, apperrors.BadRequest("duration_min must be non-negative")
	}
	if in.Capacity != nil && *in.Capacity < 1 {
		return nil, apperrors.BadRequest("capacity must be at least 1")
	}
	return s.repo.UpdateService(ctx, allyID, serviceID, in)
}
