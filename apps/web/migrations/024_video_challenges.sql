-- Video Challenges system: coach creates challenges with demo video, athlete records and tracks metrics

-- Challenges table (replaces/community_challenges for coach-assigned challenges)
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  athlete_id TEXT, -- NULL = open challenge for all athletes
  title TEXT NOT NULL,
  description TEXT,
  exercise_type TEXT NOT NULL, -- squat, deadlift, bench, etc.
  video_url TEXT, -- Coach demo video URL
  duration_minutes INTEGER DEFAULT 15,
  calories INTEGER DEFAULT 100,
  target_sets INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active', -- pending, active, completed, expired
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Challenge participations (athlete attempts, multiple per challenge)
CREATE TABLE IF NOT EXISTS challenge_participations (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  video_url TEXT, -- Athlete's recorded video
  form_score REAL, -- 0-100
  depth_score REAL,
  alignment_score REAL,
  tempo_score REAL,
  sets_completed INTEGER DEFAULT 0,
  reps_completed INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, reviewed
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(challenge_id, athlete_id, attempt_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_coach ON challenges(coach_id);
CREATE INDEX IF NOT EXISTS idx_challenges_athlete ON challenges(athlete_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_participations_challenge ON challenge_participations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_participations_athlete ON challenge_participations(athlete_id);
