package blog

// Article represents a blog/marketing article.
type Article struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Slug            string   `json:"slug"`
	Excerpt         string   `json:"excerpt"`
	Content         string   `json:"content"`
	AuthorID        string   `json:"author_id"`
	Category        string   `json:"category"`
	ImageURL        string   `json:"image_url,omitempty"`
	IsPublished     bool     `json:"is_published"`
	PublishedAt     string   `json:"published_at"`
	Tags            []string `json:"tags,omitempty"`
	ReadTimeMinutes int      `json:"read_time_minutes"`
	Views           int      `json:"views"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}