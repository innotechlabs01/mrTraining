package leaderboard

import (
	"context"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/leaderboard"
)

// Service implements the leaderboard business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new leaderboard service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// GetGroupLeaderboard returns the leaderboard for a specific group.
func (s *Service) GetGroupLeaderboard(ctx context.Context, groupID string, weekStart string) ([]*domain.GroupLeaderboard, error) {
	if weekStart == "" {
		weekStart = currentWeekStart()
	}
	return s.repo.GetGroupLeaderboard(ctx, groupID, weekStart)
}

// GetWeeklyLeaderboard returns the global weekly leaderboard.
func (s *Service) GetWeeklyLeaderboard(ctx context.Context, weekStart string, limit int) ([]*domain.WeeklyLeaderboard, error) {
	if weekStart == "" {
		weekStart = currentWeekStart()
	}
	if limit <= 0 {
		limit = 50
	}
	return s.repo.GetWeeklyLeaderboard(ctx, weekStart, limit)
}

// GetUserHistory returns a user's leaderboard history.
func (s *Service) GetUserHistory(ctx context.Context, athleteID string, limit int) ([]*domain.LeaderboardHistory, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.repo.GetUserHistory(ctx, athleteID, limit)
}

// currentWeekStart returns the Monday of the current week in YYYY-MM-DD format.
func currentWeekStart() string {
	now := time.Now()
	weekday := now.Weekday()
	if weekday == 0 {
		weekday = 7
	}
	monday := now.AddDate(0, 0, -int(weekday-1))
	return monday.Format("2006-01-02")
}
