-- Which wearable device wrote each running session (Apple Watch, Garmin, ...).
--
-- Rationale: running_sessions has no place for the recording device, and an
-- ALTER TABLE would break fresh databases (the table is bootstrapped outside
-- the migration chain). This side table keeps the data without touching
-- running_sessions:
--   external_id  — the device's own workout identifier (HKWorkout uuid,
--                  Health Connect record id, Garmin activity id). UNIQUE per
--                  user, so re-syncing the same workout is a no-op.
--   source       — canonical origin: apple_watch | garmin | health_connect | phone
--   device_name  — what the platform reports, e.g. "Apple Watch de Juan",
--                  "Forerunner 265". This is how we know which watch it was.
--   device_brand — Apple / Garmin / ...
--
-- Additive only: new table, no changes to existing tables.
CREATE TABLE IF NOT EXISTS running_session_devices (
  session_id   TEXT PRIMARY KEY REFERENCES running_sessions(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  external_id  TEXT NOT NULL,
  source       TEXT NOT NULL,
  device_name  TEXT,
  device_brand TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_running_session_devices_user_external
  ON running_session_devices(user_id, external_id);

CREATE INDEX IF NOT EXISTS idx_running_session_devices_user
  ON running_session_devices(user_id);
