package blog

// Article represents a blog/marketing article.
type Article struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Slug        string   `json:"slug"`
	Excerpt     string   `json:"excerpt"`
	Content     string   `json:"content"`
	AuthorID    string   `json:"author_id"`
	PublishedAt string   `json:"published_at"`
	Tags        []string `json:"tags,omitempty"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}