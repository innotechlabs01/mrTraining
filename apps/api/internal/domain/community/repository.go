package community

import "context"

// Repository defines the persistence interface for community domain.
type Repository interface {
	ListPosts(ctx context.Context, coachID string) ([]*Post, error)
	CreatePost(ctx context.Context, post *Post) error
	ListForums(ctx context.Context) ([]*ForumTopic, error)
	ListChallenges(ctx context.Context) ([]*Challenge, error)
	ListMessages(ctx context.Context, forumID string) ([]*Message, error)
	CreateMessage(ctx context.Context, msg *Message) error
}
