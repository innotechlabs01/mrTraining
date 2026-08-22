-- Workout templates: per-workout exercise list and athlete session/tracking logs
-- Exercises belong to an assigned_workout; sessions and per-set logs belong to an athlete.

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg REAL,
  rest_seconds INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS workout_session_logs (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  current_exercise_index INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_set_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_session_logs(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight_kg REAL,
  reps REAL,
  completed INTEGER NOT NULL DEFAULT 0,
  logged_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_session_athlete ON workout_session_logs(athlete_id, workout_id);
CREATE INDEX IF NOT EXISTS idx_set_log_session ON workout_set_logs(session_id);
