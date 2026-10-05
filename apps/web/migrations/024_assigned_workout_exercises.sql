-- Assigned workout exercises: per-assignment exercise prescriptions.
-- Separate from workout_template_exercises and workout_exercises (which are templates/prescriptions).
-- These are the concrete exercises for a specific assigned_workouts row.
-- Mirrors workout_exercises schema for full feature parity.

CREATE TABLE IF NOT EXISTS assigned_workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg REAL,
  rest_seconds INTEGER,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  muscle_groups TEXT NOT NULL DEFAULT '[]',
  library_exercise_id TEXT,
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
  body_part TEXT
);
CREATE INDEX IF NOT EXISTS idx_assigned_workout_exercises_workout ON assigned_workout_exercises(workout_id);