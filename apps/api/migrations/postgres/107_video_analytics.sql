-- Video analytics tables for exercise form tracking (PostgreSQL equivalent of 007_video_analytics.sql)
CREATE TABLE IF NOT EXISTS video_analytics_sessions (
    id             TEXT PRIMARY KEY,
    athlete_id     TEXT NOT NULL,
    workout_id     TEXT NOT NULL DEFAULT '',
    exercise_id    TEXT NOT NULL,
    exercise_name  TEXT NOT NULL DEFAULT '',
    duration_sec   INTEGER NOT NULL DEFAULT 0,
    rep_count      INTEGER NOT NULL DEFAULT 0,
    avg_form_score REAL NOT NULL DEFAULT 0,
    min_form_score REAL NOT NULL DEFAULT 0,
    max_form_score REAL NOT NULL DEFAULT 0,
    video_url      TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'completed',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_analytics_athlete ON video_analytics_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_exercise ON video_analytics_sessions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_created ON video_analytics_sessions(created_at DESC);
