-- Gamification tables for streaks, badges, and personal records (PostgreSQL equivalent of 004_gamification.sql)
CREATE TABLE IF NOT EXISTS gamification_streaks (
    id             TEXT PRIMARY KEY,
    athlete_id     TEXT NOT NULL UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_workout_date TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_streaks_athlete ON gamification_streaks(athlete_id);

CREATE TABLE IF NOT EXISTS gamification_workout_days (
    id            TEXT PRIMARY KEY,
    athlete_id    TEXT NOT NULL,
    workout_date  TEXT NOT NULL,
    workout_id    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(athlete_id, workout_date)
);

CREATE INDEX IF NOT EXISTS idx_gamification_workout_days_athlete ON gamification_workout_days(athlete_id);
CREATE INDEX IF NOT EXISTS idx_gamification_workout_days_date ON gamification_workout_days(workout_date);

CREATE TABLE IF NOT EXISTS gamification_badges (
    id          TEXT PRIMARY KEY,
    athlete_id  TEXT NOT NULL,
    badge_id    TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(athlete_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_badges_athlete ON gamification_badges(athlete_id);

CREATE TABLE IF NOT EXISTS gamification_prs (
    id            TEXT PRIMARY KEY,
    athlete_id    TEXT NOT NULL,
    exercise_id   TEXT NOT NULL,
    best_value    REAL NOT NULL,
    unit          TEXT NOT NULL,
    achieved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    previous_best REAL,
    UNIQUE(athlete_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_prs_athlete ON gamification_prs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_gamification_prs_exercise ON gamification_prs(exercise_id);
