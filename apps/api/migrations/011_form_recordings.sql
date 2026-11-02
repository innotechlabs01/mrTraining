-- Form Recordings — athlete-uploaded form-check videos with analysis metadata.
-- Uploaded via POST /api/v1/form-recordings/upload. Schema owned by the Go API.

CREATE TABLE IF NOT EXISTS form_recordings (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  workout_id TEXT,                       -- optional, links the recording to a workout session
  form_score REAL NOT NULL,              -- AI form analysis score
  form_metrics TEXT,                     -- raw JSON payload from the client (depth, alignment, tempo, ...)
  video_url TEXT NOT NULL,               -- served path, e.g. /uploads/form-recordings/<file>
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_form_recordings_athlete ON form_recordings(athlete_id);
CREATE INDEX IF NOT EXISTS idx_form_recordings_athlete_exercise ON form_recordings(athlete_id, exercise_id);
