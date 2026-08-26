-- Community forums
CREATE TABLE IF NOT EXISTS community_forums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  coach_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Community messages
CREATE TABLE IF NOT EXISTS community_messages (
  id TEXT PRIMARY KEY,
  forum_id TEXT NOT NULL REFERENCES community_forums(id),
  user_id TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Community challenges
CREATE TABLE IF NOT EXISTS community_challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 15,
  calories INTEGER DEFAULT 100,
  participants_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS community_challenge_participants (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES community_challenges(id),
  user_id TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  progress INTEGER DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

-- Athlete notifications
CREATE TABLE IF NOT EXISTS athlete_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  icon TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Athlete favorites
CREATE TABLE IF NOT EXISTS athlete_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_title TEXT,
  item_meta TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, item_type, item_id)
);
