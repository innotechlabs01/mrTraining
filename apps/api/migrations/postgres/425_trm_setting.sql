-- 425_trm_setting.sql
-- Registra la clave trm.current en platform_settings para la TRM automática
-- con margen del 8%. No crea tabla nueva: reusa platform_settings (420).
-- Valor JSONB: { value, vigencia_desde, fetched_at, margin_pct, source }
-- El worker de jobs/runner.go (startTRMPrefetch, cada 4h) escribe esta clave.

COMMENT ON TABLE platform_settings IS
  'Almacén de configuración de plataforma (clave -> valor JSONB). Clave "trm.current": TRM automática con margen del 8%, valor { value, vigencia_desde, fetched_at, margin_pct, source }.';
