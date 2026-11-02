package dto

// CreateFavoriteRequest is the payload for creating a favorite.
type CreateFavoriteRequest struct {
	ItemType  string  `json:"item_type"`
	ItemID    string  `json:"item_id"`
	ItemTitle string  `json:"item_title"`
	ItemMeta  *string `json:"item_meta,omitempty"`
}

// FavoriteResponse is the response shape for a favorite item.
type FavoriteResponse struct {
	ID         string  `json:"id"`
	ItemType   string  `json:"item_type"`
	ItemID     string  `json:"item_id"`
	ItemTitle  string  `json:"item_title"`
	ItemMeta   *string `json:"item_meta,omitempty"`
	CreatedAt  string  `json:"created_at"`
}