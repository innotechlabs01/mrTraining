-- running_gps_points — puntos GPS de sesiones de running.
-- Referencia running_sessions (creada en 001_running_sessions.sql).
CREATE TABLE IF NOT EXISTS running_gps_points (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
    lat        REAL NOT NULL,
    lng        REAL NOT NULL,
    alt        REAL,
    timestamp  TIMESTAMPTZ NOT NULL,
    accuracy   REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_running_gps_points_session ON running_gps_points(session_id);
CREATE INDEX IF NOT EXISTS idx_running_gps_points_session_timestamp ON running_gps_points(session_id, timestamp);
