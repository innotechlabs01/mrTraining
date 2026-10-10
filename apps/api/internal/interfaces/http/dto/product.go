package dto

// CreateProductRequest is the payload for creating a new product.
type CreateProductRequest struct {
	// Name is the product name (required, 1-200 characters).
	Name string `json:"name"`
	// Brand is the product brand.
	Brand string `json:"brand"`
	// ImageURL is the URL to the product image.
	ImageURL string `json:"image_url"`
	// Price is the retail price.
	Price float64 `json:"price"`
	// Received is the cost/amount received per unit.
	Received float64 `json:"received"`
	// Gross is the gross margin per unit.
	Gross float64 `json:"gross"`
	// Stock is the current inventory count.
	Stock int `json:"stock"`
	// LowStockThreshold is the threshold for low stock alerts (default: 5).
	LowStockThreshold int `json:"low_stock_threshold"`
	// Description is an optional product description shown in the store.
	Description string `json:"description"`
	// Category is an optional product category (e.g. supplements, apparel).
	Category string `json:"category"`
	// IsShop controls whether the product is visible in the public store.
	IsShop bool `json:"is_shop"`
}

// UpdateProductRequest is the payload for updating a product.
// Text fields and scalars keep the historical "ignore zero values" semantics,
// except description/category (empty string is a valid clear) and is_shop
// (pointer so an explicit false is distinguishable from "not provided").
type UpdateProductRequest struct {
	Name              string  `json:"name,omitempty"`
	Brand             string  `json:"brand,omitempty"`
	ImageURL          string  `json:"image_url,omitempty"`
	Price             float64 `json:"price,omitempty"`
	Received          float64 `json:"received,omitempty"`
	Gross             float64 `json:"gross,omitempty"`
	Stock             int     `json:"stock,omitempty"`
	LowStockThreshold int     `json:"low_stock_threshold,omitempty"`
	Description       *string `json:"description,omitempty"`
	Category          *string `json:"category,omitempty"`
	IsShop            *bool   `json:"is_shop,omitempty"`
}

// ProductResponse represents a product in API responses.
type ProductResponse struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Brand             string  `json:"brand"`
	ImageURL          string  `json:"image_url"`
	Price             float64 `json:"price"`
	Received          float64 `json:"received"`
	Gross             float64 `json:"gross"`
	Stock             int     `json:"stock"`
	LowStockThreshold int     `json:"low_stock_threshold"`
	Description       string  `json:"description"`
	Category          string  `json:"category"`
	IsShop            bool    `json:"is_shop"`
	CoachID           string  `json:"coach_id"`
	CreatedAt         string  `json:"created_at"`
	UpdatedAt         string  `json:"updated_at"`
}

// RecordSaleRequest is the payload for recording a sale.
type RecordSaleRequest struct {
	// ProductID is the ID of the product being sold (required).
	ProductID string `json:"product_id"`
	// Quantity is the number of units sold.
	Quantity int `json:"quantity"`
	// UnitPrice is the price per unit (defaults to product price if 0).
	UnitPrice float64 `json:"unit_price"`
	// UnitReceived is the cost per unit (defaults to product received if 0).
	UnitReceived float64 `json:"unit_received"`
	// Total is the total sale amount (calculated if 0).
	Total float64 `json:"total"`
	// Date is the sale date in YYYY-MM-DD format.
	Date string `json:"date"`
}

// SaleResponse represents a sale in API responses.
type SaleResponse struct {
	ID           string  `json:"id"`
	ProductID    string  `json:"product_id"`
	ProductName  string  `json:"product_name"`
	Brand        string  `json:"brand"`
	Quantity     int     `json:"quantity"`
	UnitPrice    float64 `json:"unit_price"`
	UnitReceived float64 `json:"unit_received"`
	Total        float64 `json:"total"`
	Date         string  `json:"date"`
	CoachID      string  `json:"coach_id"`
	CreatedAt    string  `json:"created_at"`
}
