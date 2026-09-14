-- Form metrics: stores athlete form analysis data (no video).
-- Lightweight JSON metrics synced from mobile after each workout.

CREATE TABLE IF NOT EXISTS form_metrics (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  workout_id TEXT,
  form_score REAL NOT NULL DEFAULT 0,
  depth REAL NOT NULL DEFAULT 0,
  alignment REAL NOT NULL DEFAULT 0,
  tempo REAL NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_form_metrics_athlete ON form_metrics(athlete_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_metrics_exercise ON form_metrics(exercise_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_metrics_workout ON form_metrics(workout_id);
