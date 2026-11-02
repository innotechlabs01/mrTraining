package coachfeed

// Post represents a coach feed post.
type Post struct {
	ID           string `json:"id"`
	CoachID      string `json:"coach_id"`
	CoachName    string `json:"coach_name"`
	Content      string `json:"content"`
	MediaType    string `json:"media_type"`
	MediaURL     string `json:"media_url"`
	LikeCount    int    `json:"like_count"`
	CommentCount int    `json:"comment_count"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// Reaction represents a like/reaction on a post.
type Reaction struct {
	ID        string `json:"id"`
	PostID    string `json:"post_id"`
	AthleteID string `json:"athlete_id"`
	Type      string `json:"type"`
	CreatedAt string `json:"created_at"`
}

// Comment represents a comment on a post.
type Comment struct {
	ID          string `json:"id"`
	PostID      string `json:"post_id"`
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name"`
	Content     string `json:"content"`
	CreatedAt   string `json:"created_at"`
}
