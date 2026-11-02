-- Leaderboard tables for group and weekly rankings.
-- Migration 005: 2026-09-09

CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    athlete_id TEXT NOT NULL,
    athlete_name TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL DEFAULT 0,
    week_start TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_group_week ON leaderboard_entries(group_id, week_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_athlete ON leaderboard_entries(athlete_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week_points ON leaderboard_entries(week_start, points DESC);
