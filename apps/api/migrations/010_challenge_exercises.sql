-- Challenge Exercises — support multiple exercises per challenge (visual, optional)
-- Each challenge can have 0..N exercises with order, video demo, and metadata

CREATE TABLE IF NOT EXISTS challenge_exercises (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,        -- sentadilla, deadlift, bench, etc.
  title TEXT,                         -- optional display name (e.g., "Sentadilla con pausa")
  description TEXT,                   -- optional coaching cues
  video_url TEXT,                     -- optional demo video for this specific exercise
  order_index INTEGER NOT NULL DEFAULT 0, -- display order
  target_sets INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  target_weight_kg REAL,              -- optional weight target
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_challenge_exercises_challenge ON challenge_exercises(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_exercises_order ON challenge_exercises(challenge_id, order_index);