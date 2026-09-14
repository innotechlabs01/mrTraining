package coachfeed

import (
	"context"
	"fmt"
	"testing"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coachfeed"
)

// mockRepository implements coachfeed.Repository for testing.
type mockRepository struct {
	listPostsFn     func(ctx context.Context, limit int, offset int) ([]*domain.Post, error)
	getPostFn       func(ctx context.Context, postID string) (*domain.Post, error)
	createPostFn    func(ctx context.Context, post *domain.Post) error
	deletePostFn    func(ctx context.Context, postID string, coachID string) error
	addReactionFn   func(ctx context.Context, reaction *domain.Reaction) error
	removeReactionFn func(ctx context.Context, postID string, athleteID string) error
	addCommentFn    func(ctx context.Context, comment *domain.Comment) error
	listCommentsFn  func(ctx context.Context, postID string, limit int, offset int) ([]*domain.Comment, error)
}

func (m *mockRepository) ListPosts(ctx context.Context, limit int, offset int) ([]*domain.Post, error) {
	return m.listPostsFn(ctx, limit, offset)
}

func (m *mockRepository) GetPost(ctx context.Context, postID string) (*domain.Post, error) {
	return m.getPostFn(ctx, postID)
}

func (m *mockRepository) CreatePost(ctx context.Context, post *domain.Post) error {
	return m.createPostFn(ctx, post)
}

func (m *mockRepository) DeletePost(ctx context.Context, postID string, coachID string) error {
	return m.deletePostFn(ctx, postID, coachID)
}

func (m *mockRepository) AddReaction(ctx context.Context, reaction *domain.Reaction) error {
	return m.addReactionFn(ctx, reaction)
}

func (m *mockRepository) RemoveReaction(ctx context.Context, postID string, athleteID string) error {
	return m.removeReactionFn(ctx, postID, athleteID)
}

func (m *mockRepository) AddComment(ctx context.Context, comment *domain.Comment) error {
	return m.addCommentFn(ctx, comment)
}

func (m *mockRepository) ListComments(ctx context.Context, postID string, limit int, offset int) ([]*domain.Comment, error) {
	return m.listCommentsFn(ctx, postID, limit, offset)
}

func TestListPosts_Success(t *testing.T) {
	mock := &mockRepository{
		listPostsFn: func(ctx context.Context, limit int, offset int) ([]*domain.Post, error) {
			return []*domain.Post{
				{ID: "p1", CoachID: "c1", CoachName: "Coach Mike", Content: "Great session today!"},
			}, nil
		},
	}

	svc := NewService(mock)
	posts, err := svc.ListPosts(context.Background(), 20, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("expected 1 post, got %d", len(posts))
	}
	if posts[0].Content != "Great session today!" {
		t.Errorf("expected 'Great session today!', got '%s'", posts[0].Content)
	}
}

func TestListPosts_DefaultLimit(t *testing.T) {
	var capturedLimit int
	mock := &mockRepository{
		listPostsFn: func(ctx context.Context, limit int, offset int) ([]*domain.Post, error) {
			capturedLimit = limit
			return []*domain.Post{}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.ListPosts(context.Background(), 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 20 {
		t.Errorf("expected default limit 20, got %d", capturedLimit)
	}
}

func TestGetPost_Success(t *testing.T) {
	mock := &mockRepository{
		getPostFn: func(ctx context.Context, postID string) (*domain.Post, error) {
			return &domain.Post{ID: postID, CoachID: "c1", Content: "Hello"}, nil
		},
	}

	svc := NewService(mock)
	post, err := svc.GetPost(context.Background(), "p1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.ID != "p1" {
		t.Errorf("expected ID 'p1', got '%s'", post.ID)
	}
}

func TestCreatePost_Success(t *testing.T) {
	mock := &mockRepository{
		createPostFn: func(ctx context.Context, post *domain.Post) error {
			return nil
		},
	}

	svc := NewService(mock)
	post, err := svc.CreatePost(context.Background(), "c1", "Coach Mike", "New post", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.CoachID != "c1" {
		t.Errorf("expected coach ID 'c1', got '%s'", post.CoachID)
	}
	if post.Content != "New post" {
		t.Errorf("expected content 'New post', got '%s'", post.Content)
	}
	if post.ID == "" {
		t.Error("expected generated ID, got empty")
	}
}

func TestCreatePost_EmptyContent_ReturnsError(t *testing.T) {
	mock := &mockRepository{}
	svc := NewService(mock)

	_, err := svc.CreatePost(context.Background(), "c1", "Coach", "", "", "")
	if err == nil {
		t.Fatal("expected error for empty content, got nil")
	}
}

func TestCreatePost_WhitespaceContent_ReturnsError(t *testing.T) {
	mock := &mockRepository{}
	svc := NewService(mock)

	_, err := svc.CreatePost(context.Background(), "c1", "Coach", "   ", "", "")
	if err == nil {
		t.Fatal("expected error for whitespace content, got nil")
	}
}

func TestDeletePost_Success(t *testing.T) {
	mock := &mockRepository{
		deletePostFn: func(ctx context.Context, postID string, coachID string) error {
			return nil
		},
	}

	svc := NewService(mock)
	err := svc.DeletePost(context.Background(), "p1", "c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDeletePost_Error(t *testing.T) {
	mock := &mockRepository{
		deletePostFn: func(ctx context.Context, postID string, coachID string) error {
			return fmt.Errorf("not found")
		},
	}

	svc := NewService(mock)
	err := svc.DeletePost(context.Background(), "p1", "c1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestAddReaction_Success(t *testing.T) {
	mock := &mockRepository{
		addReactionFn: func(ctx context.Context, reaction *domain.Reaction) error {
			return nil
		},
	}

	svc := NewService(mock)
	err := svc.AddReaction(context.Background(), "p1", "a1", "like")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAddComment_Success(t *testing.T) {
	mock := &mockRepository{
		addCommentFn: func(ctx context.Context, comment *domain.Comment) error {
			return nil
		},
	}

	svc := NewService(mock)
	comment, err := svc.AddComment(context.Background(), "p1", "a1", "Alice", "Nice work!")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if comment.PostID != "p1" {
		t.Errorf("expected post ID 'p1', got '%s'", comment.PostID)
	}
	if comment.Content != "Nice work!" {
		t.Errorf("expected content 'Nice work!', got '%s'", comment.Content)
	}
}

func TestAddComment_EmptyContent_ReturnsError(t *testing.T) {
	mock := &mockRepository{}
	svc := NewService(mock)

	_, err := svc.AddComment(context.Background(), "p1", "a1", "Alice", "")
	if err == nil {
		t.Fatal("expected error for empty content, got nil")
	}
}

func TestListComments_Success(t *testing.T) {
	mock := &mockRepository{
		listCommentsFn: func(ctx context.Context, postID string, limit int, offset int) ([]*domain.Comment, error) {
			return []*domain.Comment{
				{ID: "c1", PostID: postID, AthleteID: "a1", Content: "Looks great!"},
			}, nil
		},
	}

	svc := NewService(mock)
	comments, err := svc.ListComments(context.Background(), "p1", 20, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(comments))
	}
}
