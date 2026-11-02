-- Workout templates: coach-designed plans saved from the builder, assignable to many
-- athletes. Exercises mirror the enriched workout_exercises shape so assignment copies
-- carry progression policy and muscle mapping from day one.

CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  estimated_duration_minutes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workout_templates_coach ON workout_templates(coach_id);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 0,
  weight_kg REAL,
  rest_seconds INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  mode TEXT NOT NULL DEFAULT 'reps',
  phase TEXT NOT NULL DEFAULT 'work',
  superset_group TEXT,
  reps_min INTEGER,
  reps_max INTEGER,
  prog TEXT,
  inc REAL,
  sec INTEGER,
  minutes REAL,
  speed REAL,
  per_side INTEGER NOT NULL DEFAULT 0,
  body_part TEXT,
  muscle_groups TEXT NOT NULL DEFAULT '',
  library_exercise_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON workout_template_exercises(template_id, sort_order);
