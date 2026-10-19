-- GPS points for running sessions.
-- Additive only: creates running_gps_points referencing running_sessions(id).
-- No existing tables or columns are modified.
--
-- running_gps_points: one GPS sample per row, captured during a running session.
-- lat/lng are decimal degrees; alt in meters; timestamp RFC3339 UTC; accuracy in meters.
CREATE TABLE IF NOT EXISTS running_gps_points (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  alt        REAL,
  timestamp  TEXT NOT NULL,    -- RFC3339 UTC
  accuracy   REAL,             -- meters
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_running_gps_points_session ON running_gps_points(session_id);
CREATE INDEX IF NOT EXISTS idx_running_gps_points_session_timestamp ON running_gps_points(session_id, timestamp);
