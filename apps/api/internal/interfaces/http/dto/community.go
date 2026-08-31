package dto

// CommunityResponse is the aggregated response for GET /athlete/community.
type CommunityResponse struct {
	Forums     []ForumTopicResponse `json:"forums"`
	Challenges []ChallengeResponse  `json:"challenges"`
}

// ForumTopicResponse represents a forum topic in API responses.
type ForumTopicResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// ChallengeResponse represents a challenge in API responses.
type ChallengeResponse struct {
	ID                string `json:"id"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	DurationMinutes   int    `json:"durationMinutes"`
	Calories          int    `json:"calories"`
	ParticipantsCount int    `json:"participantsCount"`
}

// MessageResponse represents a community message in API responses.
type MessageResponse struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	UserName  string `json:"userName"`
	Message   string `json:"message"`
	CreatedAt string `json:"createdAt"`
}

// CommunityMessageResponse is an alias for MessageResponse for clarity.
type CommunityMessageResponse = MessageResponse

// CreateMessageRequest is the payload for POST /athlete/community/messages.
type CreateMessageRequest struct {
	ForumID string `json:"forumId"`
	Message string `json:"message"`
}
