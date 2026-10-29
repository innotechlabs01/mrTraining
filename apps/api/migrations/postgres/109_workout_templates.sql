-- Workout Templates (PostgreSQL equivalent of 009_workout_templates.sql)
-- NOTE: references exercises table which comes from 111_exercise_library.sql
CREATE TABLE IF NOT EXISTS workout_templates (
    id                TEXT PRIMARY KEY,
    coach_id          TEXT NOT NULL,
    name              TEXT NOT NULL,
    description       TEXT,
    category          TEXT,
    difficulty_level  TEXT,
    duration_minutes  INTEGER,
    is_public         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_coach ON workout_templates(coach_id);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id                TEXT PRIMARY KEY,
    template_id       TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id       TEXT NOT NULL,
    order_index       INTEGER NOT NULL DEFAULT 0,
    sets              INTEGER NOT NULL DEFAULT 3,
    reps_min          INTEGER NOT NULL DEFAULT 8,
    reps_max          INTEGER NOT NULL DEFAULT 12,
    rest_seconds      INTEGER NOT NULL DEFAULT 90,
    rpe_target        REAL,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template ON workout_template_exercises(template_id);
