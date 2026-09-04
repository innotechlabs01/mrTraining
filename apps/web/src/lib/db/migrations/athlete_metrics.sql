-- athlete_prs
CREATE TABLE IF NOT EXISTS athlete_prs (
  athlete_clerk_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL NOT NULL,
  volume REAL GENERATED ALWAYS AS (reps * weight) STORED,
  logged_at TEXT NOT NULL,
  PRIMARY KEY (athlete_clerk_id, exercise_id)
);

-- athlete_session_stats
CREATE TABLE IF NOT EXISTS athlete_session_stats (
  session_id TEXT PRIMARY KEY,
  athlete_clerk_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- athlete_session_progress
CREATE TABLE IF NOT EXISTS athlete_session_progress (
  session_id TEXT PRIMARY KEY,
  athlete_clerk_id TEXT NOT NULL,
  total_volume REAL,
  duration_seconds INTEGER,
  updated_at TEXT NOT NULL
);
