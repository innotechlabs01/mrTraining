-- Create nutrition_meal_logs table for athlete meal logging.
-- Mirrors the nutrition domain MealLog aggregate.
-- Applied manually to Turso (no runner).
CREATE TABLE IF NOT EXISTS nutrition_meal_logs (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id  TEXT NOT NULL,
    meal_type   TEXT NOT NULL,
    foods       TEXT NOT NULL DEFAULT '[]',
    macros      TEXT NOT NULL DEFAULT '{}',
    logged_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_athlete_id
    ON nutrition_meal_logs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_logged_at
    ON nutrition_meal_logs(logged_at);
