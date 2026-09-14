package coachfeed

import "context"

// Repository defines the coach feed persistence interface.
type Repository interface {
	ListPosts(ctx context.Context, limit int, offset int) ([]*Post, error)
	GetPost(ctx context.Context, postID string) (*Post, error)
	CreatePost(ctx context.Context, post *Post) error
	DeletePost(ctx context.Context, postID string, coachID string) error
	AddReaction(ctx context.Context, reaction *Reaction) error
	RemoveReaction(ctx context.Context, postID string, athleteID string) error
	AddComment(ctx context.Context, comment *Comment) error
	ListComments(ctx context.Context, postID string, limit int, offset int) ([]*Comment, error)
}
