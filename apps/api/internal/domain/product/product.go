// Package product defines the core product and sales domain entities for the MR Training API.
// It includes Product and Sale types that map to the database schema.
package product

// Product represents a product offered by a coach (supplements, gear, plans, etc.).
type Product struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Brand              string  `json:"brand"`
	ImageURL           string  `json:"image_url"`
	Price              float64 `json:"price"`
	Received           float64 `json:"received"`
	Gross              float64 `json:"gross"`
	Stock              int     `json:"stock"`
	LowStockThreshold  int     `json:"low_stock_threshold"`
	CoachID            string  `json:"coach_id"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

// Sale represents a recorded sale of a product by a coach.
type Sale struct {
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
