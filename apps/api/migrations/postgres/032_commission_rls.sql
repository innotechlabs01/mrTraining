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

-- 0. Ensure base tables exist idempotently if running on a clean database before 300_remaining_migrations.
CREATE TABLE IF NOT EXISTS allies (
    id              TEXT PRIMARY KEY,
    owner_user_id   TEXT,
    legal_name      TEXT NOT NULL,
    commercial_name TEXT NOT NULL,
    category        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_allies_owner ON allies(owner_user_id);

CREATE TABLE IF NOT EXISTS coach_ally_relationships (
    id           TEXT PRIMARY KEY,
    coach_id     TEXT NOT NULL,
    ally_id      TEXT NOT NULL REFERENCES allies(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'invited',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (coach_id, ally_id)
);
CREATE INDEX IF NOT EXISTS idx_car_coach ON coach_ally_relationships(coach_id);
CREATE INDEX IF NOT EXISTS idx_car_ally ON coach_ally_relationships(ally_id);

CREATE TABLE IF NOT EXISTS commission_agreements (
    id                 TEXT PRIMARY KEY,
    relationship_id    TEXT NOT NULL,
    coach_id           TEXT NOT NULL DEFAULT '',
    ally_id            TEXT NOT NULL DEFAULT '',
    version            INTEGER NOT NULL DEFAULT 1,
    rate_bps           INTEGER NOT NULL DEFAULT 0,
    fixed_amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commission_agreements_rel ON commission_agreements(relationship_id);

CREATE TABLE IF NOT EXISTS commission_entries (
    id                   TEXT PRIMARY KEY,
    operation_id         TEXT NOT NULL DEFAULT '',
    relationship_id      TEXT NOT NULL DEFAULT '',
    coach_id             TEXT NOT NULL DEFAULT '',
    agreement_id         TEXT NOT NULL DEFAULT '',
    agreement_version    INTEGER NOT NULL DEFAULT 1,
    base_cents           INTEGER NOT NULL DEFAULT 0,
    rate_bps             INTEGER NOT NULL DEFAULT 0,
    fixed_amount_cents   INTEGER NOT NULL DEFAULT 0,
    amount_cents         INTEGER NOT NULL DEFAULT 0,
    currency             TEXT NOT NULL DEFAULT 'COP',
    status               TEXT NOT NULL DEFAULT 'accrued',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Add coach_id to commission_agreements for RLS enforcement.
ALTER TABLE commission_agreements
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
