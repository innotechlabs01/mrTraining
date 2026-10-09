// Package store provides application services for the athlete-facing store.
package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/store"
)

// Service handles athlete store business logic.
type Service struct {
	repo store.Repository
}

// NewService creates a new store service.
func NewService(repo store.Repository) *Service {
	return &Service{repo: repo}
}

// ListProducts returns all products available in the store.
func (s *Service) ListProducts(ctx context.Context) ([]*store.Product, error) {
	products, err := s.repo.ListProducts(ctx)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	if products == nil {
		products = []*store.Product{}
	}
	return products, nil
}

// PurchaseProduct creates a purchase for an athlete.
func (s *Service) PurchaseProduct(ctx context.Context, athleteID, productID string, quantity int) (*store.Purchase, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if strings.TrimSpace(productID) == "" {
		return nil, fmt.Errorf("product ID is required")
	}
	if quantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than 0")
	}

	product, err := s.repo.GetProduct(ctx, productID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, fmt.Errorf("product not found")
	}

	purchase := &store.Purchase{
		ID:        uuid.New().String(),
		AthleteID: athleteID,
		ProductID: productID,
		Quantity:  quantity,
		Price:     product.Price,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.repo.CreatePurchase(ctx, purchase); err != nil {
		return nil, fmt.Errorf("create purchase: %w", err)
	}

	return purchase, nil
}

// GetPaymentsByDate reporte de pagos por fecha específica
func (s *Service) GetPaymentsByDate(ctx context.Context, date string) ([]*store.Purchase, error) {
	payments, err := s.repo.ListPurchases(ctx)
	if err != nil {
		return nil, err
	}
	var result []*store.Purchase
	for _, p := range payments {
		if p.CreatedAt == date {
			result = append(result, p)
		}
	}
	return result, nil
}

// GetDailyRevenue reporte de ingresos totales por fecha
func (s *Service) GetDailyRevenue(ctx context.Context, date string) (float64, error) {
	payments, err := s.GetPaymentsByDate(ctx, date)
	if err != nil {
		return 0, err
	}
	var total float64
	for _, p := range payments {
		total += p.Price
	}
	return total, nil
}

