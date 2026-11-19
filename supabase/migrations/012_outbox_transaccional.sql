-- Migration: 012_outbox_transaccional.sql
-- Add outbox table for reliable realtime event delivery
-- This migration creates the outbox table that guarantees event delivery
-- even if the server crashes after PostgreSQL commits the transaction.

-- -------------------------------------------------------
-- Tabla outbox: registro transaccional de eventos realtime
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    aggregate_type VARCHAR(30) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    coach_id VARCHAR(255),
    athlete_id VARCHAR(255),
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para selección eficiente por worker de publicación
-- Este índice selecciona el próximo evento pendiente cuya hora de reintento ya pasó
CREATE INDEX IF NOT EXISTS idx_outbox_pending
ON outbox (status, next_retry_at)
WHERE status = 'pending';

-- Índice para eventos ya publicados (para reporte y limpieza)
CREATE INDEX IF NOT EXISTS idx_outbox_published
ON outbox (status, published_at)
WHERE status = 'published';

-- Índices para consulta por entidad (coach o atleta que suscribe eventos)
CREATE INDEX IF NOT EXISTS idx_outbox_coach
ON outbox (coach_id)
WHERE coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_athlete
ON outbox (athlete_id)
WHERE athlete_id IS NOT NULL;

-- Comentario para documentación del esquema
COMMENT ON TABLE outbox IS 'Tabla Outbox para eventos realtime transaccionales. Garantiza entrega de eventos: template.created, template.updated, assignment.created, workout.started, workout.completed. Los eventos se guardan dentro de la misma transacción PostgreSQL que la operación de negocio, por lo que el COMMIT confirma ambos o ninguno.';

COMMENT ON COLUMN outbox.status IS 'Estado del evento: pending (pendiente de publicar), processing (siendo publicado), published (publicado exitosamente), failed (falló permanentemente)';
COMMENT ON COLUMN outbox.attempts IS 'Contador de intentos de publicación, usado para calcular next_retry_at con backoff exponencial';
COMMENT ON COLUMN outbox.next_retry_at IS 'Próximo momento programado para reintento. Se calcula como NOW() + backoff^attempts';
COMMENT ON COLUMN outbox.last_error IS 'Último error ocurrido durante un intento de publicación (null si el último intento fue exitoso)';