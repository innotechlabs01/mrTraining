-- Create nutrition_meal_logs table for athlete meal logging.
-- Mirrors the nutrition domain MealLog aggregate.
CREATE TABLE IF NOT EXISTS nutrition_meal_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id  UUID NOT NULL,
    meal_type   VARCHAR(50) NOT NULL,
    foods       JSONB NOT NULL DEFAULT '[]',
    macros      JSONB NOT NULL DEFAULT '{}',
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_athlete_id
    ON nutrition_meal_logs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_logged_at
    ON nutrition_meal_logs(logged_at);
