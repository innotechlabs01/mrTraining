-- Health metrics from wearables (Apple Watch via HealthKit, Android watches via Health Connect).
-- Devices are registered after the athlete grants native permissions; metrics arrive in
-- batches from the mobile sync engine; sleep is stored per reference night with stage detail.
-- Idempotency: UNIQUE(athlete_id, metric_type, recorded_at) + INSERT OR IGNORE keeps
-- re-syncs duplicate-free.

CREATE TABLE IF NOT EXISTS athlete_health_devices (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,             -- healthkit | healthconnect | garmin
  device_name TEXT NOT NULL DEFAULT '',
  device_brand TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  access_token TEXT,                  -- Garmin OAuth2 only (future)
  refresh_token TEXT,
  token_expires_at TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(athlete_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_health_devices_athlete ON athlete_health_devices(athlete_id);

CREATE TABLE IF NOT EXISTS athlete_health_metrics (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,          -- resting_hr | hrv | steps | vo2max | active_calories | workout_duration
  value REAL NOT NULL,
  unit TEXT NOT NULL,                 -- bpm | ms | steps | ml/kg/min | kcal | minutes
  source TEXT NOT NULL,               -- healthkit | healthconnect | garmin | manual
  source_workout_id TEXT,             -- workout_session_logs.id when captured around a training session
  recorded_at TEXT NOT NULL,          -- when the watch measured it
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_health_metrics_dedupe ON athlete_health_metrics(athlete_id, metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_metrics_athlete_time ON athlete_health_metrics(athlete_id, metric_type, recorded_at DESC);

CREATE TABLE IF NOT EXISTS athlete_sleep_logs (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                 -- YYYY-MM-DD reference night
  total_minutes INTEGER NOT NULL,
  deep_minutes INTEGER,
  rem_minutes INTEGER,
  light_minutes INTEGER,
  awake_minutes INTEGER,
  efficiency REAL,                    -- 0..1
  score REAL,                         -- 0..100 when the device provides one
  source TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sleep_dedupe ON athlete_sleep_logs(athlete_id, date, source);
CREATE INDEX IF NOT EXISTS idx_sleep_athlete_date ON athlete_sleep_logs(athlete_id, date DESC);
