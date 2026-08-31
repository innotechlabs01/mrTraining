package dto

// ArticleResponse is the response shape for a blog article.
type ArticleResponse struct {
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