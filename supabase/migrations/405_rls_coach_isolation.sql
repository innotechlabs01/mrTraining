-- Phase Build2 / B2: Row-Level Security — coach tenant isolation.
--
-- Tenant model (decision 2026-11-02): the COACH is the tenant. RLS key is
-- app.current_coach_id, set transaction-locally by the UnitOfWork
-- (database/uow.go) via Begin(ctx, userID, coachID, role).
--
-- Defense in depth: application-layer filtering (coach_id) is complemented by
-- PostgreSQL RLS so a coach can never see another coach's rows, even if a
-- query omits the coach_id filter.
--
-- Tables are owned by postgres; the application connects as mr_training_app
-- (non-owner) so RLS policies apply to every app query. The session variable
-- app.current_coach_id is custom (namespaced with a dot) and can be set by any
-- role transaction-locally via set_config(..., true).
--
-- Policy shape (never USING true):
--   SELECT .. USING (coach_id = current_setting('app.current_coach_id', true)::text)
--   INSERT .. WITH CHECK (coach_id = current_setting(...)::text)
--   UPDATE .. USING (...) WITH CHECK (...)
--   DELETE .. USING (...)
--
-- Rollback: DROP POLICY + ALTER TABLE ... DISABLE ROW LEVEL SECURITY (no data
-- loss, no column drops). Re-applying is safe: ADD COLUMN IF NOT EXISTS +
-- DROP POLICY IF EXISTS + CREATE POLICY are all idempotent.
--
-- commission_entries lacked coach_id (032_commission_rls.sql assumed one).
-- It is backfilled here from commission_agreements.coach_id via agreement_id
-- so RLS can be enforced without joins (audit Option A).

-- 0. commission_entries: add coach_id and backfill from its parent agreement.
ALTER TABLE commission_entries
  ADD COLUMN IF NOT EXISTS coach_id TEXT NOT NULL DEFAULT '';

UPDATE commission_entries ce
SET coach_id = ca.coach_id
FROM commission_agreements ca
WHERE ce.agreement_id = ca.id
  AND ce.coach_id = '';

CREATE INDEX IF NOT EXISTS idx_rls_coach_commission_entries ON commission_entries (coach_id);

-- 1. Coach-tenant tables (already carry coach_id).
DO $$
DECLARE
    tables text[] := ARRAY[
        'ai_suggestions',
        'assigned_workouts',
        'athlete_memberships',
        'blog_posts',
        'challenges',
        'coach_athlete_links',
        'coach_athletes',
        'coach_feed_posts',
        'coach_sessions',
        'coach_settlements',
        'commission_agreements',
        'commission_entries',
        'daily_summaries',
        'dashboard_metrics',
        'events',
        'exercise_library',
        'live_sessions',
        'message_threads',
        'outbox',
        'payment_methods',
        'pending_invites',
        'plan_distribution',
        'plans',
        'products',
        'programs',
        'public_page_config',
        'recent_activity',
        'revenue_history',
        'running_workout_assignments',
        'running_workout_templates',
        'sales',
        'store_orders',
        'support_tickets',
        'time_blocks',
        'workout_templates'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_sel ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_ins ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_upd ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_del ON %I', t, t);

        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_sel ON %I FOR SELECT USING (coach_id = current_setting(''app.current_coach_id'', true)::text)',
            t, t);
        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_ins ON %I FOR INSERT WITH CHECK (coach_id = current_setting(''app.current_coach_id'', true)::text)',
            t, t);
        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_upd ON %I FOR UPDATE USING (coach_id = current_setting(''app.current_coach_id'', true)::text) WITH CHECK (coach_id = current_setting(''app.current_coach_id'', true)::text)',
            t, t);
        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_del ON %I FOR DELETE USING (coach_id = current_setting(''app.current_coach_id'', true)::text)',
            t, t);
    END LOOP;
END $$;

-- 2. User-scoped tables (already carry user_id). RLS key app.current_user_id.
DO $$
DECLARE
    tables text[] := ARRAY[
        'device_connections',
        'posts',
        'push_tokens',
        'running_session_devices',
        'running_sessions',
        'wearable_oauth_tokens'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_sel ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_ins ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_upd ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation_del ON %I', t, t);

        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_sel ON %I FOR SELECT USING (user_id = current_setting(''app.current_user_id'', true)::text)',
            t, t);
        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_ins ON %I FOR INSERT WITH CHECK (user_id = current_setting(''app.current_user_id'', true)::text)',
            t, t);
        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_upd ON %I FOR UPDATE USING (user_id = current_setting(''app.current_user_id'', true)::text) WITH CHECK (user_id = current_setting(''app.current_user_id'', true)::text)',
            t, t);
        EXECUTE format(
            'CREATE POLICY %I_tenant_isolation_del ON %I FOR DELETE USING (user_id = current_setting(''app.current_user_id'', true)::text)',
            t, t);
    END LOOP;
END $$;

-- Indexes to support RLS policy lookups. Non-duplicate, safe to re-run.
CREATE INDEX IF NOT EXISTS idx_rls_coach_ai_suggestions ON ai_suggestions (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_assigned_workouts ON assigned_workouts (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_athlete_memberships ON athlete_memberships (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_blog_posts ON blog_posts (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_challenges ON challenges (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_coach_athlete_links ON coach_athlete_links (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_coach_athletes ON coach_athletes (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_coach_feed_posts ON coach_feed_posts (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_coach_sessions ON coach_sessions (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_coach_settlements ON coach_settlements (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_commission_agreements ON commission_agreements (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_daily_summaries ON daily_summaries (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_dashboard_metrics ON dashboard_metrics (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_events ON events (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_exercise_library ON exercise_library (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_live_sessions ON live_sessions (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_message_threads ON message_threads (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_outbox ON outbox (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_payment_methods ON payment_methods (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_pending_invites ON pending_invites (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_plan_distribution ON plan_distribution (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_plans ON plans (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_products ON products (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_programs ON programs (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_public_page_config ON public_page_config (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_recent_activity ON recent_activity (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_revenue_history ON revenue_history (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_running_workout_assignments ON running_workout_assignments (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_running_workout_templates ON running_workout_templates (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_sales ON sales (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_store_orders ON store_orders (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_support_tickets ON support_tickets (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_time_blocks ON time_blocks (coach_id);
CREATE INDEX IF NOT EXISTS idx_rls_coach_workout_templates ON workout_templates (coach_id);

CREATE INDEX IF NOT EXISTS idx_rls_user_device_connections ON device_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_rls_user_posts ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_rls_user_push_tokens ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_rls_user_running_session_devices ON running_session_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_rls_user_running_sessions ON running_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_rls_user_wearable_oauth_tokens ON wearable_oauth_tokens (user_id);
