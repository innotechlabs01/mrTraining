// Package product provides the application service layer for the product domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package product

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	productdomain "github.com/innotechlabs01/mr-training-api/internal/domain/product"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service implements product-related business operations.
// It depends on the product.Repository interface, making it testable with mocks.
type Service struct {
	repo productdomain.Repository
}

// NewService creates a new product application service with the given repository.
func NewService(repo productdomain.Repository) *Service {
	return &Service{repo: repo}
}

// ListProducts returns all products for the given coach.
func (s *Service) ListProducts(ctx context.Context, coachID string) ([]*productdomain.Product, error) {
	products, err := s.repo.ListByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return products, nil
}

// GetProduct returns a single product by ID.
func (s *Service) GetProduct(ctx context.Context, id string) (*productdomain.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	return product, nil
}

// CreateProduct creates a new product. Only coaches can create products.
func (s *Service) CreateProduct(ctx context.Context, coachID string, req dto.CreateProductRequest) (*productdomain.Product, error) {
	product := &productdomain.Product{
		ID:                uuid.New().String(),
		Name:              req.Name,
		Brand:             req.Brand,
		ImageURL:          req.ImageURL,
		Price:             req.Price,
		Received:          req.Received,
		Gross:             req.Gross,
		Stock:             req.Stock,
		LowStockThreshold: req.LowStockThreshold,
		CoachID:           coachID,
	}

	if product.LowStockThreshold == 0 {
		product.LowStockThreshold = 5
	}

	if err := s.repo.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("create product: %w", err)
	}

	return product, nil
}

// UpdateProduct updates an existing product. Only the owning coach can update.
func (s *Service) UpdateProduct(ctx context.Context, id string, req dto.UpdateProductRequest) (*productdomain.Product, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get product for update: %w", err)
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Brand != "" {
		existing.Brand = req.Brand
	}
	if req.ImageURL != "" {
		existing.ImageURL = req.ImageURL
	}
	if req.Price > 0 {
		existing.Price = req.Price
	}
	if req.Received > 0 {
		existing.Received = req.Received
	}
	if req.Gross > 0 {
		existing.Gross = req.Gross
	}
	if req.Stock > 0 {
		existing.Stock = req.Stock
	}
	if req.LowStockThreshold > 0 {
		existing.LowStockThreshold = req.LowStockThreshold
	}

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}

	return existing, nil
}

// DeleteProduct removes a product by ID.
func (s *Service) DeleteProduct(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	return nil
}

// GetSales returns all sales for the given coach.
func (s *Service) GetSales(ctx context.Context, coachID string) ([]*productdomain.Sale, error) {
	sales, err := s.repo.ListSalesByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list sales: %w", err)
	}
	return sales, nil
}

// RecordSale records a new sale and decrements product stock.
func (s *Service) RecordSale(ctx context.Context, coachID string, req dto.RecordSaleRequest) (*productdomain.Sale, error) {
	// Verify product exists and belongs to the coach
	product, err := s.repo.GetByID(ctx, req.ProductID)
	if err != nil {
		return nil, err
	}
	if product.CoachID != coachID {
		return nil, fmt.Errorf("product does not belong to this coach")
	}

	sale := &productdomain.Sale{
		ID:           uuid.New().String(),
		ProductID:    req.ProductID,
		ProductName:  product.Name,
		Brand:        product.Brand,
		Quantity:     req.Quantity,
		UnitPrice:    req.UnitPrice,
		UnitReceived: req.UnitReceived,
		Total:        req.Total,
		Date:         req.Date,
		CoachID:      coachID,
	}

	if sale.UnitPrice == 0 {
		sale.UnitPrice = product.Price
	}
	if sale.Total == 0 {
		sale.Total = float64(sale.Quantity) * sale.UnitPrice
	}

	if err := s.repo.CreateSale(ctx, sale); err != nil {
		return nil, fmt.Errorf("record sale: %w", err)
	}

	return sale, nil
}
