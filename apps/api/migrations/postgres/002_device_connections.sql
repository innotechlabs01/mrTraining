-- device_connections — DDL faltante: usada por ConnectDevice/DisconnectDevice
-- (handlers de running). No existía migración propia.
CREATE TABLE IF NOT EXISTS device_connections (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    device_type  TEXT NOT NULL,   -- apple_watch | garmin | healthkit
    is_active    BOOLEAN NOT NULL DEFAULT true,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_connections_user_id ON device_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_active ON device_connections(is_active);
