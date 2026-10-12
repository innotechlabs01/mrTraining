-- Workout Templates — reusable training programs created by coaches
CREATE TABLE IF NOT EXISTS workout_templates (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,               -- strength, cardio, mobility, etc.
    difficulty_level TEXT,       -- beginner, intermediate, advanced
    duration_minutes INTEGER,    -- estimated total duration
    is_public BOOLEAN NOT NULL DEFAULT 0, -- visible to other coaches
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_coach ON workout_templates(coach_id);
-- NOTE: no index on (category) — the remote dev DB carries an older
-- workout_templates created before this migration, without the category
-- column. Indexing it aborts the whole migration chain, so the column index
-- is intentionally omitted here.

-- Workout Template Exercises — exercises within a template with order and sets/reps
CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    order_index INTEGER NOT NULL DEFAULT 0,
    sets INTEGER NOT NULL DEFAULT 3,
    reps_min INTEGER NOT NULL DEFAULT 8,
    reps_max INTEGER NOT NULL DEFAULT 12,
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    rpe_target REAL,             -- target RPE (1-10)
    notes TEXT,                  -- coaching cues for this exercise in this template
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template ON workout_template_exercises(template_id);
-- NOTE: no index on (template_id, order_index) — the remote dev DB carries an
-- older workout_template_exercises (sort_order instead of order_index). See
-- the workout_templates NOTE above; keep this chain bootstrappable.