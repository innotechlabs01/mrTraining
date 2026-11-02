package leaderboard

import "context"

// Repository defines the leaderboard persistence interface.
type Repository interface {
	GetGroupLeaderboard(ctx context.Context, groupID string, weekStart string) ([]*GroupLeaderboard, error)
	GetWeeklyLeaderboard(ctx context.Context, weekStart string, limit int) ([]*WeeklyLeaderboard, error)
	GetUserHistory(ctx context.Context, athleteID string, limit int) ([]*LeaderboardHistory, error)
	UpsertLeaderboardEntry(ctx context.Context, entry *GroupLeaderboard) error
}
