-- running_session_devices — dispositivo que grabó cada sesión de running.
-- Referencia running_sessions (creada en 001_running_sessions.sql).
CREATE TABLE IF NOT EXISTS running_session_devices (
    session_id   TEXT PRIMARY KEY REFERENCES running_sessions(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL,
    external_id  TEXT NOT NULL,
    source       TEXT NOT NULL,
    device_name  TEXT,
    device_brand TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_running_session_devices_user_external ON running_session_devices(user_id, external_id);
CREATE INDEX IF NOT EXISTS idx_running_session_devices_user ON running_session_devices(user_id);
