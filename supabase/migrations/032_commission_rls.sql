-- Phase E / Fase 4: Row-Level Security for commission tables.
-- Defense in depth: application-layer filtering (coach_id) is complemented by
-- PostgreSQL RLS so that a coach can never see another coach's commissions,
-- even if a query omits the coach_id filter.
--
-- The commission_agreements table (020_commissions.sql) lacks a coach_id
-- column, so we add one (denormalized from coach_ally_relationships) to make
-- RLS enforcement possible without joins.
--
-- Tenant model: coach is the tenant (decision 2026-11-02). RLS key is
-- app.current_coach_id, set transaction-locally by the UnitOfWork.

-- Pre-declaración idempotente para ejecuciones sobre base de datos limpia
CREATE TABLE IF NOT EXISTS allies (
    id             TEXT PRIMARY KEY,
    owner_user_id  TEXT NOT NULL,
    legal_name     TEXT NOT NULL,
    commercial_name TEXT NOT NULL,
    category       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_ally_relationships (
    id            TEXT PRIMARY KEY,
    coach_id      TEXT NOT NULL,
    ally_id       TEXT NOT NULL REFERENCES allies(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'invited',
    attributed_by TEXT,
    invited_at    TEXT,
    activated_at  TEXT,
    ended_at      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_agreements (
    id                 TEXT PRIMARY KEY,
    coach_id           TEXT NOT NULL DEFAULT '',
    ally_id            TEXT NOT NULL DEFAULT '',
    relationship_id    TEXT DEFAULT '',
    version            INTEGER NOT NULL DEFAULT 1,
    rate_bps           INTEGER NOT NULL DEFAULT 0,
    fixed_amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_entries (
    id                   TEXT PRIMARY KEY,
    agreement_id         TEXT NOT NULL,
    coach_id             TEXT NOT NULL DEFAULT '',
    version              INTEGER NOT NULL DEFAULT 1,
    base_cents           INTEGER NOT NULL DEFAULT 0,
    rate_bps             INTEGER NOT NULL DEFAULT 0,
    fixed_amount_cents   INTEGER NOT NULL DEFAULT 0,
    amount_cents         INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Add coach_id to commission_agreements for RLS enforcement.
ALTER TABLE commission_agreements
  ADD COLUMN IF NOT EXISTS coach_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commission_agreements
  ADD COLUMN IF NOT EXISTS relationship_id TEXT DEFAULT '';
ALTER TABLE commission_entries
  ADD COLUMN IF NOT EXISTS coach_id TEXT NOT NULL DEFAULT '';

-- Backfill coach_id from the relationship for existing rows.
UPDATE commission_agreements ca
SET coach_id = car.coach_id
FROM coach_ally_relationships car
WHERE ca.relationship_id = car.id
  AND ca.coach_id = '';

-- Index for RLS policy lookups.
CREATE INDEX IF NOT EXISTS idx_commission_agreements_coach
  ON commission_agreements (coach_id);

-- 2. commission_entries (025_commission_entries.sql) already has coach_id.
CREATE INDEX IF NOT EXISTS idx_commission_entries_coach_rls
  ON commission_entries (coach_id);

-- 3. Enable RLS on both tables.
ALTER TABLE commission_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_entries ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: a row is visible only if coach_id matches the session's
--    current coach. The session variable app.current_coach_id is set by the
--    UnitOfWork (transaction-local) or by the request-scoped RLS middleware.
CREATE POLICY commission_agreements_tenant_isolation ON commission_agreements
  FOR ALL
  USING (coach_id = current_setting('app.current_coach_id', true)::text);

CREATE POLICY commission_entries_tenant_isolation ON commission_entries
  FOR ALL
  USING (coach_id = current_setting('app.current_coach_id', true)::text);
