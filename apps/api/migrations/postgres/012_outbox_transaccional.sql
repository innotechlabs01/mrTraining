-- Migration: 012_outbox_transaccional.sql
-- Transactional Outbox for reliable realtime event delivery.
-- Schema corrected per Fase 1 audit (MASTER_PENDING.md).

CREATE TABLE IF NOT EXISTS outbox (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    event_type    VARCHAR(50) NOT NULL,
    aggregate_type VARCHAR(30) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    coach_id     VARCHAR(255),
    athlete_id   VARCHAR(255),
    payload      JSONB NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    attempts     INTEGER NOT NULL DEFAULT 0,
    locked_by    VARCHAR(255),
    locked_until TIMESTAMPTZ,
    last_error   TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','published','dead')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending event selection + lease recovery support.
CREATE INDEX IF NOT EXISTS idx_outbox_pending
ON outbox (status, next_retry_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbox_locked
ON outbox (status, locked_until)
WHERE status = 'processing';

-- Published events for reports/cleanup.
CREATE INDEX IF NOT EXISTS idx_outbox_published
ON outbox (status, published_at)
WHERE status = 'published';

-- Entity subscription indexes.
CREATE INDEX IF NOT EXISTS idx_outbox_coach
ON outbox (coach_id)
WHERE coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_athlete
ON outbox (athlete_id)
WHERE athlete_id IS NOT NULL;

-- event_id protected for idempotent delivery.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_event_id
ON outbox (event_id);
