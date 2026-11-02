-- running_sessions — DDL faltante: referenciada por running_gps_points (027)
-- y running_session_devices (031), pero sin migración propia en el repositorio.
-- Tabla base para sesiones de running (manuales o sincronizadas de wearables).
CREATE TABLE IF NOT EXISTS running_sessions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    date         TIMESTAMPTZ NOT NULL,
    distance     REAL NOT NULL DEFAULT 0,       -- km
    duration     INTEGER NOT NULL DEFAULT 0,    -- seconds
    pace         TEXT,                          -- "5:30" min/km
    speed        REAL,                          -- km/h
    calories     INTEGER NOT NULL DEFAULT 0,
    elevation    REAL NOT NULL DEFAULT 0,       -- meters
    heart_rate   INTEGER,
    cadence      INTEGER,
    gps_route    TEXT,                          -- encoded polyline
    source       TEXT NOT NULL DEFAULT 'manual',-- manual | mobile_gps | apple_watch | garmin | health_connect
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_running_sessions_user_id ON running_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_running_sessions_date ON running_sessions(date);
CREATE INDEX IF NOT EXISTS idx_running_sessions_source ON running_sessions(source);
