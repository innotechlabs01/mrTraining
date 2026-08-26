package product

import (
	"context"
	"testing"

	productdomain "github.com/innotechlabs01/mr-training-api/internal/domain/product"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// mockRepository implements product.Repository for testing.
type mockRepository struct {
	listByCoachFn     func(ctx context.Context, coachID string) ([]*productdomain.Product, error)
	getByIDFn         func(ctx context.Context, id string) (*productdomain.Product, error)
	createFn          func(ctx context.Context, product *productdomain.Product) error
	updateFn          func(ctx context.Context, product *productdomain.Product) error
	deleteFn          func(ctx context.Context, id string) error
	updateStockFn     func(ctx context.Context, id string, delta int) error
	listSalesByCoachFn func(ctx context.Context, coachID string) ([]*productdomain.Sale, error)
	createSaleFn      func(ctx context.Context, sale *productdomain.Sale) error
}

func (m *mockRepository) ListByCoach(ctx context.Context, coachID string) ([]*productdomain.Product, error) {
	return m.listByCoachFn(ctx, coachID)
}

func (m *mockRepository) GetByID(ctx context.Context, id string) (*productdomain.Product, error) {
	return m.getByIDFn(ctx, id)
}

func (m *mockRepository) Create(ctx context.Context, product *productdomain.Product) error {
	return m.createFn(ctx, product)
}

func (m *mockRepository) Update(ctx context.Context, product *productdomain.Product) error {
	return m.updateFn(ctx, product)
}

func (m *mockRepository) Delete(ctx context.Context, id string) error {
	return m.deleteFn(ctx, id)
}

func (m *mockRepository) UpdateStock(ctx context.Context, id string, delta int) error {
	return m.updateStockFn(ctx, id, delta)
}

func (m *mockRepository) ListSalesByCoach(ctx context.Context, coachID string) ([]*productdomain.Sale, error) {
	return m.listSalesByCoachFn(ctx, coachID)
}

func (m *mockRepository) CreateSale(ctx context.Context, sale *productdomain.Sale) error {
	return m.createSaleFn(ctx, sale)
}

func TestListProducts_Success(t *testing.T) {
	mock := &mockRepository{
		listByCoachFn: func(ctx context.Context, coachID string) ([]*productdomain.Product, error) {
			return []*productdomain.Product{
				{ID: "prod-1", Name: "Protein", CoachID: coachID, Price: 29.99},
				{ID: "prod-2", Name: "Creatine", CoachID: coachID, Price: 19.99},
			}, nil
		},
	}

	svc := NewService(mock)
	products, err := svc.ListProducts(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(products) != 2 {
		t.Fatalf("expected 2 products, got %d", len(products))
	}
	if products[0].Name != "Protein" {
		t.Errorf("expected name 'Protein', got '%s'", products[0].Name)
	}
}

func TestListProducts_Empty(t *testing.T) {
	mock := &mockRepository{
		listByCoachFn: func(ctx context.Context, coachID string) ([]*productdomain.Product, error) {
			return []*productdomain.Product{}, nil
		},
	}

	svc := NewService(mock)
	products, err := svc.ListProducts(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(products) != 0 {
		t.Errorf("expected 0 products, got %d", len(products))
	}
}

func TestGetProduct_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return &productdomain.Product{ID: id, Name: "Whey Protein", Price: 49.99}, nil
		},
	}

	svc := NewService(mock)
	product, err := svc.GetProduct(context.Background(), "prod-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product.Name != "Whey Protein" {
		t.Errorf("expected name 'Whey Protein', got '%s'", product.Name)
	}
}

func TestGetProduct_NotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return nil, errors.NotFound("Product", id)
		},
	}

	svc := NewService(mock)
	_, err := svc.GetProduct(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent product")
	}
}

func TestCreateProduct_Success(t *testing.T) {
	var createdProduct *productdomain.Product
	mock := &mockRepository{
		createFn: func(ctx context.Context, product *productdomain.Product) error {
			createdProduct = product
			return nil
		},
	}

	svc := NewService(mock)
	product, err := svc.CreateProduct(context.Background(), "coach-1", dto.CreateProductRequest{
		Name:              "BCAA",
		Brand:             "Optimum Nutrition",
		Price:             34.99,
		Received:          20.00,
		Gross:             14.99,
		Stock:             50,
		LowStockThreshold: 10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if createdProduct == nil {
		t.Fatal("expected product to be created")
	}
	if createdProduct.Name != "BCAA" {
		t.Errorf("expected name 'BCAA', got '%s'", createdProduct.Name)
	}
	if createdProduct.CoachID != "coach-1" {
		t.Errorf("expected coach_id 'coach-1', got '%s'", createdProduct.CoachID)
	}
	if product.LowStockThreshold != 10 {
		t.Errorf("expected low_stock_threshold 10, got %d", product.LowStockThreshold)
	}
}

func TestCreateProduct_DefaultThreshold(t *testing.T) {
	mock := &mockRepository{
		createFn: func(ctx context.Context, product *productdomain.Product) error { return nil },
	}

	svc := NewService(mock)
	product, err := svc.CreateProduct(context.Background(), "coach-1", dto.CreateProductRequest{
		Name:  "Test Product",
		Price: 10.00,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product.LowStockThreshold != 5 {
		t.Errorf("expected default low_stock_threshold 5, got %d", product.LowStockThreshold)
	}
}

func TestUpdateProduct_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return &productdomain.Product{ID: id, Name: "Old Name", Price: 10.00}, nil
		},
		updateFn: func(ctx context.Context, product *productdomain.Product) error { return nil },
	}

	svc := NewService(mock)
	product, err := svc.UpdateProduct(context.Background(), "prod-1", dto.UpdateProductRequest{
		Name:  "New Name",
		Price: 25.00,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product.Name != "New Name" {
		t.Errorf("expected name 'New Name', got '%s'", product.Name)
	}
	if product.Price != 25.00 {
		t.Errorf("expected price 25.00, got %f", product.Price)
	}
}

func TestDeleteProduct_Success(t *testing.T) {
	mock := &mockRepository{
		deleteFn: func(ctx context.Context, id string) error { return nil },
	}

	svc := NewService(mock)
	err := svc.DeleteProduct(context.Background(), "prod-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDeleteProduct_NotFound(t *testing.T) {
	mock := &mockRepository{
		deleteFn: func(ctx context.Context, id string) error {
			return errors.NotFound("Product", id)
		},
	}

	svc := NewService(mock)
	err := svc.DeleteProduct(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent product")
	}
}

func TestGetSales_Success(t *testing.T) {
	mock := &mockRepository{
		listSalesByCoachFn: func(ctx context.Context, coachID string) ([]*productdomain.Sale, error) {
			return []*productdomain.Sale{
				{ID: "sale-1", ProductName: "Protein", Total: 59.98, CoachID: coachID},
			}, nil
		},
	}

	svc := NewService(mock)
	sales, err := svc.GetSales(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sales) != 1 {
		t.Fatalf("expected 1 sale, got %d", len(sales))
	}
	if sales[0].Total != 59.98 {
		t.Errorf("expected total 59.98, got %f", sales[0].Total)
	}
}

func TestRecordSale_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return &productdomain.Product{
				ID:      id,
				Name:    "Whey Protein",
				Brand:   "ON",
				Price:   49.99,
				Received: 30.00,
				CoachID: "coach-1",
			}, nil
		},
		createSaleFn: func(ctx context.Context, sale *productdomain.Sale) error {
			return nil
		},
	}

	svc := NewService(mock)
	sale, err := svc.RecordSale(context.Background(), "coach-1", dto.RecordSaleRequest{
		ProductID: "prod-1",
		Quantity:  2,
		Date:      "2025-03-15",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sale.ProductName != "Whey Protein" {
		t.Errorf("expected product_name 'Whey Protein', got '%s'", sale.ProductName)
	}
	if sale.Quantity != 2 {
		t.Errorf("expected quantity 2, got %d", sale.Quantity)
	}
	if sale.Total != 99.98 {
		t.Errorf("expected total 99.98, got %f", sale.Total)
	}
}

func TestRecordSale_ProductNotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return nil, errors.NotFound("Product", id)
		},
	}

	svc := NewService(mock)
	_, err := svc.RecordSale(context.Background(), "coach-1", dto.RecordSaleRequest{
		ProductID: "nonexistent",
		Quantity:  1,
		Date:      "2025-03-15",
	})
	if err == nil {
		t.Fatal("expected error for nonexistent product")
	}
}

func TestRecordSale_WrongCoach(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return &productdomain.Product{ID: id, CoachID: "other-coach"}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.RecordSale(context.Background(), "coach-1", dto.RecordSaleRequest{
		ProductID: "prod-1",
		Quantity:  1,
		Date:      "2025-03-15",
	})
	if err == nil {
		t.Fatal("expected error for wrong coach")
	}
}

func TestRecordSale_CalculatesTotal(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*productdomain.Product, error) {
			return &productdomain.Product{ID: id, Name: "Item", Price: 25.00, CoachID: "coach-1"}, nil
		},
		createSaleFn: func(ctx context.Context, sale *productdomain.Sale) error { return nil },
	}

	svc := NewService(mock)
	sale, err := svc.RecordSale(context.Background(), "coach-1", dto.RecordSaleRequest{
		ProductID: "prod-1",
		Quantity:  3,
		UnitPrice: 25.00,
		Date:      "2025-03-15",
		// Total not set — should be calculated
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sale.Total != 75.00 {
		t.Errorf("expected total 75.00, got %f", sale.Total)
	}
}
