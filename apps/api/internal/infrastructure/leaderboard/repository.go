package leaderboard

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"
	"strings"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/leaderboard"
)

// Repository implements the leaderboard.Repository interface using libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new leaderboard repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}
// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// GetGroupLeaderboard returns the leaderboard for a specific group.
func (r *Repository) GetGroupLeaderboard(ctx context.Context, groupID string, weekStart string) ([]*domain.GroupLeaderboard, error) {
	if r.exec == nil {
		return []*domain.GroupLeaderboard{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, group_id, athlete_id, athlete_name, points, rank, week_start, created_at, updated_at
		FROM leaderboard_entries
		WHERE group_id = $1 AND week_start = $2
		ORDER BY points DESC
	`, groupID, weekStart)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*domain.GroupLeaderboard{}, nil
		}
		return nil, fmt.Errorf("get group leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*domain.GroupLeaderboard
	for rows.Next() {
		e := &domain.GroupLeaderboard{}
		if err := rows.Scan(&e.ID, &e.GroupID, &e.AthleteID, &e.AthleteName, &e.Points, &e.Rank, &e.WeekStart, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan leaderboard entry: %w", err)
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []*domain.GroupLeaderboard{}
	}
	return entries, nil
}

// GetWeeklyLeaderboard returns the global weekly leaderboard.
func (r *Repository) GetWeeklyLeaderboard(ctx context.Context, weekStart string, limit int) ([]*domain.WeeklyLeaderboard, error) {
	if r.exec == nil {
		return []*domain.WeeklyLeaderboard{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT athlete_id, athlete_name, points, week_start
		FROM leaderboard_entries
		WHERE week_start = $1
		ORDER BY points DESC
		LIMIT $2
	`, weekStart, limit)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*domain.WeeklyLeaderboard{}, nil
		}
		return nil, fmt.Errorf("get weekly leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*domain.WeeklyLeaderboard
	rank := 1
	for rows.Next() {
		e := &domain.WeeklyLeaderboard{Rank: rank}
		if err := rows.Scan(&e.AthleteID, &e.AthleteName, &e.Points, &e.WeekStart); err != nil {
			return nil, fmt.Errorf("scan weekly leaderboard: %w", err)
		}
		entries = append(entries, e)
		rank++
	}
	if entries == nil {
		entries = []*domain.WeeklyLeaderboard{}
	}
	return entries, nil
}

// GetUserHistory returns a user's leaderboard history.
func (r *Repository) GetUserHistory(ctx context.Context, athleteID string, limit int) ([]*domain.LeaderboardHistory, error) {
	if r.exec == nil {
		return []*domain.LeaderboardHistory{}, nil
	}
	rows, err := r.exec.QueryContext(ctx, `
		SELECT week_start, rank, points, group_id
		FROM leaderboard_entries
		WHERE athlete_id = $1
		ORDER BY week_start DESC
		LIMIT $2
	`, athleteID, limit)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*domain.LeaderboardHistory{}, nil
		}
		return nil, fmt.Errorf("get user history: %w", err)
	}
	defer rows.Close()

	var entries []*domain.LeaderboardHistory
	for rows.Next() {
		e := &domain.LeaderboardHistory{}
		if err := rows.Scan(&e.WeekStart, &e.Rank, &e.Points, &e.GroupName); err != nil {
			return nil, fmt.Errorf("scan user history: %w", err)
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []*domain.LeaderboardHistory{}
	}
	return entries, nil
}

// UpsertLeaderboardEntry creates or updates a leaderboard entry.
func (r *Repository) UpsertLeaderboardEntry(ctx context.Context, entry *domain.GroupLeaderboard) error {
	if r.exec == nil {
		return fmt.Errorf("database not configured")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO leaderboard_entries (id, group_id, athlete_id, athlete_name, points, rank, week_start, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT(id) DO UPDATE SET points = excluded.points, rank = excluded.rank, updated_at = excluded.updated_at
	`, entry.ID, entry.GroupID, entry.AthleteID, entry.AthleteName, entry.Points, entry.Rank, entry.WeekStart, now, now)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return fmt.Errorf("upsert leaderboard entry: %w", err)
	}
	return nil
}
