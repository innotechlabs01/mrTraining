package store

// Product represents a product available in the athlete store.
type Product struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	LowStockThreshold int   `json:"low_stock_threshold"`
	CoachID     string  `json:"coach_id"`
	ImageURL    string  `json:"image_url"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// Purchase represents an athlete's purchase of a product.
type Purchase struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	ProductID   string  `json:"product_id"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	CreatedAt   string  `json:"created_at"`
}
