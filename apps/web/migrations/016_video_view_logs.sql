-- Video view tracking: know which exercise demos are watched fully, partially, or skipped.
-- One row per session (athlete opens a video = one view session with progress events).
-- Completed = watched >= 90% of duration; abandoned = stopped before that.

CREATE TABLE IF NOT EXISTS exercise_video_views (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  last_position_sec REAL NOT NULL DEFAULT 0,
  total_duration_sec REAL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_video_views_exercise ON exercise_video_views(exercise_id, completed);
CREATE INDEX IF NOT EXISTS idx_video_views_athlete ON exercise_video_views(athlete_id, started_at DESC);
