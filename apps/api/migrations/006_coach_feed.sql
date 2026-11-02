-- Coach feed tables for posts, reactions, and comments.
-- Migration 006: 2026-09-10

CREATE TABLE IF NOT EXISTS coach_feed_posts (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    coach_name TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    media_type TEXT NOT NULL DEFAULT 'none',
    media_url TEXT NOT NULL DEFAULT '',
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_coach_feed_posts_coach ON coach_feed_posts(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_feed_posts_created ON coach_feed_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS coach_feed_reactions (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    athlete_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'like',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(post_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_feed_reactions_post ON coach_feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_coach_feed_reactions_athlete ON coach_feed_reactions(athlete_id);

CREATE TABLE IF NOT EXISTS coach_feed_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    athlete_id TEXT NOT NULL,
    athlete_name TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_coach_feed_comments_post ON coach_feed_comments(post_id);
