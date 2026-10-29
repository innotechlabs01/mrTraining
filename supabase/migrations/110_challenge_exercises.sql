-- Challenge Exercises (PostgreSQL equivalent of 010_challenge_exercises.sql)
CREATE TABLE IF NOT EXISTS challenge_exercises (
    id             TEXT PRIMARY KEY,
    challenge_id   TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    exercise_type  TEXT NOT NULL,
    title          TEXT,
    description    TEXT,
    video_url      TEXT,
    order_index    INTEGER NOT NULL DEFAULT 0,
    target_sets    INTEGER DEFAULT 3,
    target_reps    INTEGER DEFAULT 10,
    target_weight_kg REAL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_exercises_challenge ON challenge_exercises(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_exercises_order ON challenge_exercises(challenge_id, order_index);
