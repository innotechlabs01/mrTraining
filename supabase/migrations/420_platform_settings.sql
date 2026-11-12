-- 420_platform_settings.sql
-- Almacén de configuración de plataforma (clave -> valor JSONB) para el admin CRM.
-- El super admin gestiona estos valores desde /admin/settings. No hay schema
-- previo para settings de plataforma, por lo que esta migración la crea desde cero.
CREATE TABLE IF NOT EXISTS platform_settings (
    key        TEXT PRIMARY KEY,
    value      JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas por grupo de clave (prefijo antes del punto, ej. "general.*").
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);
