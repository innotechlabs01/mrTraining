-- Push notification tokens for athletes and coaches.
-- Each row is one device; the token is used to send push notifications via Expo.

CREATE TABLE IF NOT EXISTS push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'athlete',   -- athlete | coach
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'expo',  -- expo | fcm | apns
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id, is_active);
