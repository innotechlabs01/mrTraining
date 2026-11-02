package favorite

// Favorite represents an athlete's saved favorite item (workout, exercise, article).
type Favorite struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	ItemType    string  `json:"item_type"` // workout, exercise, article
	ItemID      string  `json:"item_id"`
	ItemTitle   string  `json:"item_title"`
	ItemMeta    *string `json:"item_meta,omitempty"`
	CreatedAt   string  `json:"created_at"`
}