-- Migration: 210_outbox_contract.sql
-- Aligns the outbox table with the approved Fase 1 contract.
--
-- Migration 012 created the outbox table but diverged from the approved
-- contract: it lacked event_id, locked_by, locked_until, the dead status
-- and the indexes required for FOR UPDATE SKIP LOCKED selection and retry.
--
-- Rule: never rewrite an already-applied migration. This additive migration
-- alters the existing outbox table in place. It is safe to run on top of 012.
-- Each statement is idempotent (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT
-- EXISTS, ALTER ... SET DEFAULT).

-- -------------------------------------------------------
-- event_id: identificador único del evento para idempotencia
-- -------------------------------------------------------
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS event_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_event_id ON outbox (event_id);

-- -------------------------------------------------------
-- Lease columns para claim del worker duradero
-- -------------------------------------------------------
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS locked_by VARCHAR(255);
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- -------------------------------------------------------
-- Índices para selección pendiente con lease y reintento
-- -------------------------------------------------------

-- Selección del próximo evento listo para publicar, usado con
-- FOR UPDATE SKIP LOCKED para que varios workers nunca reclamen
-- el mismo evento al mismo tiempo.
CREATE INDEX IF NOT EXISTS idx_outbox_pending_retry
ON outbox (status, next_retry_at)
WHERE status = 'pending' AND next_retry_at <= NOW();

-- Índice general de eventos pendientes (reports y consultas).
CREATE INDEX IF NOT EXISTS idx_outbox_pending
ON outbox (status, next_retry_at)
WHERE status = 'pending';

-- Eventos ya publicados (reporte y limpieza).
CREATE INDEX IF NOT EXISTS idx_outbox_published
ON outbox (status, published_at)
WHERE status = 'published';

-- Limpieza de leases caducos (liberar eventos cuyo lease expiró).
CREATE INDEX IF NOT EXISTS idx_outbox_locked
ON outbox (locked_by, locked_until)
WHERE locked_by IS NOT NULL;

-- next_retry_at por defecto apunta al momento en que ocurrió el evento.
-- La lógica de backoff exponencial lo reescribe tras cada fallo.
ALTER TABLE outbox ALTER COLUMN next_retry_at SET DEFAULT NOW();

-- -------------------------------------------------------
-- Comentarios del esquema
-- -------------------------------------------------------
COMMENT ON TABLE outbox IS 'Tabla Outbox para eventos realtime transaccionales. Los eventos se guardan dentro de la misma transacción PostgreSQL que la operación de negocio (UnitOfWork), por lo que el COMMIT confirma ambos o ninguno. El worker duradero publica cada evento una sola vez usando claimToken + FOR UPDATE SKIP LOCKED + idempotencia por event_id.';

COMMENT ON COLUMN outbox.event_id IS 'Identificador único del evento (gen_random_uuid). Clave de idempotencia: un mismo negocio genera el mismo event_id, por lo que reinsertar es un no-op gracias al índice único y ON CONFLICT DO NOTHING.';
COMMENT ON COLUMN outbox.locked_by IS 'Identificador del worker que mantiene el lease del evento (claimToken). NULL si nadie lo está procesando.';
COMMENT ON COLUMN outbox.locked_until IS 'Momento hasta el cual el worker mantiene el lease. Tras expirarlo, otro worker puede reclamar el evento.';
COMMENT ON COLUMN outbox.next_retry_at IS 'Próximo momento programado para reintento. Default NOW(); se recalcula como now() + backoff^attempts tras cada fallo.';
COMMENT ON COLUMN outbox.status IS 'Estado del evento: pending (pendiente de publicar), processing (siendo publicado con lease), published (publicado exitosamente), dead (agotado tras reintentos, no se publica más).';
COMMENT ON COLUMN outbox.attempts IS 'Contador de intentos de publicación, usado para calcular el backoff exponencial de next_retry_at.';
COMMENT ON COLUMN outbox.last_error IS 'Último error ocurrido durante un intento de publicación (null si el último intento fue exitoso).';
