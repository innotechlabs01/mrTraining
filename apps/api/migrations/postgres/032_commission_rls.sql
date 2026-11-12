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
