-- Gamification tables for streaks, badges, and personal records.
-- Migration 004: 2026-09-09

-- Streak tracking
CREATE TABLE IF NOT EXISTS gamification_streaks (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_workout_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gamification_streaks_athlete ON gamification_streaks(athlete_id);

-- Workout days (for streak calculation)
CREATE TABLE IF NOT EXISTS gamification_workout_days (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL,
    workout_date TEXT NOT NULL,
    workout_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(athlete_id, workout_date)
);

CREATE INDEX IF NOT EXISTS idx_gamification_workout_days_athlete ON gamification_workout_days(athlete_id);
CREATE INDEX IF NOT EXISTS idx_gamification_workout_days_date ON gamification_workout_days(workout_date);

-- Badges
CREATE TABLE IF NOT EXISTS gamification_badges (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(athlete_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_badges_athlete ON gamification_badges(athlete_id);

-- Personal Records
CREATE TABLE IF NOT EXISTS gamification_prs (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    best_value REAL NOT NULL,
    unit TEXT NOT NULL,
    achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    previous_best REAL,
    UNIQUE(athlete_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_prs_athlete ON gamification_prs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_gamification_prs_exercise ON gamification_prs(exercise_id);
