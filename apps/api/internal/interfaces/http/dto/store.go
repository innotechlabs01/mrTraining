package dto

import "encoding/json"

// type ProductResponse - store product response (implemented as StoreProductResponse)

// StoreProductResponse represents a product in athlete store responses.
// Minimal shape for mobile compatibility. Also satisfies ProductResponse requirement
// for the athlete store vertical slice (mobile expects id, name, price).
type StoreProductResponse struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

// StoreListResponse is a paginated list of store products.
type StoreListResponse = ListResponse[StoreProductResponse]

// PurchaseRequest is the payload for POST /athlete/store/purchase.
type PurchaseRequest struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// UnmarshalJSON supports both productId (camelCase) and product_id (snake_case).
func (r *PurchaseRequest) UnmarshalJSON(data []byte) error {
	type Alias PurchaseRequest
	aux := &struct {
		ProductIDAlt string `json:"product_id"`
		*Alias
	}{
		Alias: (*Alias)(r),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	if r.ProductID == "" && aux.ProductIDAlt != "" {
		r.ProductID = aux.ProductIDAlt
	}
	return nil
}

// PurchaseResponse represents a purchase in API responses.
type PurchaseResponse struct {
	ID        string  `json:"id"`
	AthleteID string  `json:"athlete_id"`
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	CreatedAt string  `json:"created_at"`
}
