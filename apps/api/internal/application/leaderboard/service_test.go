package leaderboard

import (
	"context"
	"fmt"
	"testing"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/leaderboard"
)

// mockRepository implements leaderboard.Repository for testing.
type mockRepository struct {
	getGroupLeaderboardFn  func(ctx context.Context, groupID string, weekStart string) ([]*domain.GroupLeaderboard, error)
	getWeeklyLeaderboardFn func(ctx context.Context, weekStart string, limit int) ([]*domain.WeeklyLeaderboard, error)
	getUserHistoryFn       func(ctx context.Context, athleteID string, limit int) ([]*domain.LeaderboardHistory, error)
	upsertLeaderboardEntryFn func(ctx context.Context, entry *domain.GroupLeaderboard) error
}

func (m *mockRepository) GetGroupLeaderboard(ctx context.Context, groupID string, weekStart string) ([]*domain.GroupLeaderboard, error) {
	return m.getGroupLeaderboardFn(ctx, groupID, weekStart)
}

func (m *mockRepository) GetWeeklyLeaderboard(ctx context.Context, weekStart string, limit int) ([]*domain.WeeklyLeaderboard, error) {
	return m.getWeeklyLeaderboardFn(ctx, weekStart, limit)
}

func (m *mockRepository) GetUserHistory(ctx context.Context, athleteID string, limit int) ([]*domain.LeaderboardHistory, error) {
	return m.getUserHistoryFn(ctx, athleteID, limit)
}

func (m *mockRepository) UpsertLeaderboardEntry(ctx context.Context, entry *domain.GroupLeaderboard) error {
	return m.upsertLeaderboardEntryFn(ctx, entry)
}

func TestGetGroupLeaderboard_Success(t *testing.T) {
	week := time.Now().Format("2006-01-02")
	mock := &mockRepository{
		getGroupLeaderboardFn: func(ctx context.Context, groupID string, ws string) ([]*domain.GroupLeaderboard, error) {
			return []*domain.GroupLeaderboard{
				{ID: "1", GroupID: groupID, AthleteID: "a1", AthleteName: "Alice", Points: 100, Rank: 1, WeekStart: ws},
				{ID: "2", GroupID: groupID, AthleteID: "a2", AthleteName: "Bob", Points: 80, Rank: 2, WeekStart: ws},
			}, nil
		},
	}

	svc := NewService(mock)
	entries, err := svc.GetGroupLeaderboard(context.Background(), "group-1", week)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Points != 100 {
		t.Errorf("expected 100 points, got %d", entries[0].Points)
	}
	if entries[0].Rank != 1 {
		t.Errorf("expected rank 1, got %d", entries[0].Rank)
	}
	if entries[1].AthleteName != "Bob" {
		t.Errorf("expected athlete name 'Bob', got '%s'", entries[1].AthleteName)
	}
}

func TestGetGroupLeaderboard_EmptyWeekStart_UsesCurrentWeek(t *testing.T) {
	var capturedWeek string
	mock := &mockRepository{
		getGroupLeaderboardFn: func(ctx context.Context, groupID string, ws string) ([]*domain.GroupLeaderboard, error) {
			capturedWeek = ws
			return []*domain.GroupLeaderboard{}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.GetGroupLeaderboard(context.Background(), "group-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedWeek == "" {
		t.Error("expected weekStart to be filled, got empty")
	}
}

func TestGetGroupLeaderboard_Error(t *testing.T) {
	mock := &mockRepository{
		getGroupLeaderboardFn: func(ctx context.Context, groupID string, ws string) ([]*domain.GroupLeaderboard, error) {
			return nil, fmt.Errorf("db error")
		},
	}

	svc := NewService(mock)
	_, err := svc.GetGroupLeaderboard(context.Background(), "group-1", "")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetWeeklyLeaderboard_Success(t *testing.T) {
	week := time.Now().Format("2006-01-02")
	mock := &mockRepository{
		getWeeklyLeaderboardFn: func(ctx context.Context, ws string, limit int) ([]*domain.WeeklyLeaderboard, error) {
			return []*domain.WeeklyLeaderboard{
				{Rank: 1, AthleteID: "a1", AthleteName: "Alice", Points: 100, WeekStart: ws},
			}, nil
		},
	}

	svc := NewService(mock)
	entries, err := svc.GetWeeklyLeaderboard(context.Background(), week, 50)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Rank != 1 {
		t.Errorf("expected rank 1, got %d", entries[0].Rank)
	}
}

func TestGetWeeklyLeaderboard_DefaultLimit(t *testing.T) {
	var capturedLimit int
	mock := &mockRepository{
		getWeeklyLeaderboardFn: func(ctx context.Context, ws string, limit int) ([]*domain.WeeklyLeaderboard, error) {
			capturedLimit = limit
			return []*domain.WeeklyLeaderboard{}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.GetWeeklyLeaderboard(context.Background(), "", -1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 50 {
		t.Errorf("expected default limit 50, got %d", capturedLimit)
	}
}

func TestGetUserHistory_Success(t *testing.T) {
	mock := &mockRepository{
		getUserHistoryFn: func(ctx context.Context, athleteID string, limit int) ([]*domain.LeaderboardHistory, error) {
			return []*domain.LeaderboardHistory{
				{WeekStart: "2026-01-01", Rank: 1, Points: 100, GroupName: "Alpha"},
			}, nil
		},
	}

	svc := NewService(mock)
	history, err := svc.GetUserHistory(context.Background(), "user-1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(history) != 1 {
		t.Fatalf("expected 1 history entry, got %d", len(history))
	}
	if history[0].GroupName != "Alpha" {
		t.Errorf("expected group name 'Alpha', got '%s'", history[0].GroupName)
	}
}

func TestGetUserHistory_DefaultLimit(t *testing.T) {
	var capturedLimit int
	mock := &mockRepository{
		getUserHistoryFn: func(ctx context.Context, athleteID string, limit int) ([]*domain.LeaderboardHistory, error) {
			capturedLimit = limit
			return []*domain.LeaderboardHistory{}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.GetUserHistory(context.Background(), "user-1", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 10 {
		t.Errorf("expected default limit 10, got %d", capturedLimit)
	}
}
