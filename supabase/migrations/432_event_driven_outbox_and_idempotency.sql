-- 432_event_driven_outbox_and_idempotency.sql
-- Evolución event-driven del esquema outbox + tablas de idempotencia HTTP/NATS y Dead Letter Queue.

BEGIN;

-- 1. Evolución de public.outbox para trazabilidad distribuida y multi-tenant EDA
ALTER TABLE public.outbox
    ALTER COLUMN event_type TYPE VARCHAR(128),
    ALTER COLUMN aggregate_type TYPE VARCHAR(100);

ALTER TABLE public.outbox
    ADD COLUMN IF NOT EXISTS event_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS correlation_id TEXT,
    ADD COLUMN IF NOT EXISTS causation_id TEXT,
    ADD COLUMN IF NOT EXISTS organization_id TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_outbox_event_type_pending
    ON public.outbox (event_type, next_retry_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbox_correlation_id
    ON public.outbox (correlation_id)
    WHERE correlation_id IS NOT NULL;

-- Regularizar RLS de outbox para permitir inserciones atómicas desde flujos de
-- coach, atleta, webhook_worker, clerk_provisioning y system_worker.
ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_tenant_isolation_sel ON public.outbox;
CREATE POLICY outbox_tenant_isolation_sel ON public.outbox FOR SELECT
USING (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
    OR coach_id::text = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id::text = NULLIF(current_setting('app.current_user_id', true), '')
    OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
);

DROP POLICY IF EXISTS outbox_tenant_isolation_ins ON public.outbox;
CREATE POLICY outbox_tenant_isolation_ins ON public.outbox FOR INSERT
WITH CHECK (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
    OR coach_id::text = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id::text = NULLIF(current_setting('app.current_user_id', true), '')
    OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
);

DROP POLICY IF EXISTS outbox_tenant_isolation_upd ON public.outbox;
CREATE POLICY outbox_tenant_isolation_upd ON public.outbox FOR UPDATE
USING (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
    OR coach_id::text = NULLIF(current_setting('app.current_coach_id', true), '')
)
WITH CHECK (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
    OR coach_id::text = NULLIF(current_setting('app.current_coach_id', true), '')
);

-- 2. Tabla processed_events: idempotencia de consumidores NATS (exactly-once efectivo por consumidor)
CREATE TABLE IF NOT EXISTS public.processed_events (
    consumer_name TEXT NOT NULL,
    event_id      TEXT NOT NULL,
    subject       TEXT NOT NULL,
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (consumer_name, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at
    ON public.processed_events (processed_at);

ALTER TABLE public.processed_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS processed_events_worker_all ON public.processed_events;
CREATE POLICY processed_events_worker_all ON public.processed_events FOR ALL
USING (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
)
WITH CHECK (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
);

-- 3. Tabla dead_letter_events: auditoría y replay de eventos que agotaron reintentos
CREATE TABLE IF NOT EXISTS public.dead_letter_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_name    TEXT NOT NULL,
    subject        TEXT NOT NULL,
    consumer_name  TEXT NOT NULL,
    event_id       TEXT,
    event_type     TEXT NOT NULL,
    correlation_id TEXT,
    payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message  TEXT NOT NULL,
    attempts       INTEGER NOT NULL DEFAULT 1,
    replayed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_events_unreplayed
    ON public.dead_letter_events (created_at DESC)
    WHERE replayed_at IS NULL;

ALTER TABLE public.dead_letter_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dead_letter_events_worker_all ON public.dead_letter_events;
CREATE POLICY dead_letter_events_worker_all ON public.dead_letter_events FOR ALL
USING (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
)
WITH CHECK (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
);

-- 4. Tabla idempotency_keys: deduplicación HTTP transaccional para pagos, checkouts y mutaciones críticas
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    scope         TEXT NOT NULL,
    key           TEXT NOT NULL,
    actor_id      TEXT NOT NULL DEFAULT '',
    request_hash  TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'in_progress',
    response_code INTEGER,
    response_body BYTEA,
    content_type  TEXT,
    locked_until  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scope, key, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
    ON public.idempotency_keys (expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idempotency_keys_app_all ON public.idempotency_keys;
CREATE POLICY idempotency_keys_app_all ON public.idempotency_keys FOR ALL
USING (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
    OR actor_id = NULLIF(current_setting('app.current_user_id', true), '')
)
WITH CHECK (
    current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker', 'clerk_provisioning')
    OR actor_id = NULLIF(current_setting('app.current_user_id', true), '')
);

-- 5. Políticas RLS adicionales para operaciones asíncronas seguras en cmd/worker
DO $$
BEGIN
    IF to_regclass('public.push_tokens') IS NOT NULL THEN
        DROP POLICY IF EXISTS push_tokens_worker_access ON public.push_tokens;
        CREATE POLICY push_tokens_worker_access ON public.push_tokens FOR ALL
        USING (current_setting('app.internal_execution_context', true) = 'system_worker')
        WITH CHECK (current_setting('app.internal_execution_context', true) = 'system_worker');
    END IF;

    IF to_regclass('public.wearable_oauth_tokens') IS NOT NULL THEN
        DROP POLICY IF EXISTS wearable_oauth_tokens_worker_access ON public.wearable_oauth_tokens;
        CREATE POLICY wearable_oauth_tokens_worker_access ON public.wearable_oauth_tokens FOR SELECT
        USING (current_setting('app.internal_execution_context', true) = 'system_worker');
    END IF;
END $$;

-- 6. Grants DML al rol de aplicación mr_training_app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
            public.outbox,
            public.processed_events,
            public.dead_letter_events,
            public.idempotency_keys
        TO mr_training_app;
    END IF;
END $$;

COMMIT;
