package community

// Post represents a legacy community post.
type Post struct {
	ID       string `json:"id"`
	AuthorID string `json:"author_id"`
	Content  string `json:"content"`
}

// ForumTopic represents a community forum topic.
type ForumTopic struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// Challenge represents a community challenge.
type Challenge struct {
	ID                string `json:"id"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	DurationMinutes   int    `json:"durationMinutes"`
	Calories          int    `json:"calories"`
	ParticipantsCount int    `json:"participantsCount"`
}

// Message represents a community forum message.
type Message struct {
	ID        string `json:"id"`
	ForumID   string `json:"forum_id"`
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	Message   string `json:"message"`
	CreatedAt string `json:"created_at"`
}
