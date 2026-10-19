-- OAuth tokens for wearable providers (Garmin Health API, future providers).
-- Additive only: new table, no changes to existing tables.
CREATE TABLE IF NOT EXISTS wearable_oauth_tokens (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  platform      TEXT NOT NULL,              -- 'garmin', 'whoop', ...
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TEXT,                       -- RFC3339 UTC
  scope         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wearable_tokens_user_platform
  ON wearable_oauth_tokens(user_id, platform);
