package store

// Product represents a product available in the athlete store.
type Product struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

// Purchase represents an athlete's purchase of a product.
type Purchase struct {
	ID        string  `json:"id"`
	AthleteID string  `json:"athlete_id"`
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	CreatedAt string  `json:"created_at"`
}
