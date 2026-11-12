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

-- The index only makes sense on the tables that exist: the migration set is
-- applied on databases built from different subsets, so a missing table must
-- not abort the whole migration.
DO $$
DECLARE
    spec record;
BEGIN
    FOR spec IN SELECT * FROM (VALUES
        ('idx_rls_coach_commission_entries', 'commission_entries', 'coach_id')
    ) AS t(idx_name, table_name, columns) LOOP
        IF to_regclass(format('public.%I', spec.table_name)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
            spec.idx_name, spec.table_name, spec.columns);
    END LOOP;
END $$;
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
        -- Skip the tables that this schema does not have: the migration has to
        -- apply on a database built from the current migration set.
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            CONTINUE;
        END IF;
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
        -- Skip the tables that this schema does not have: the migration has to
        -- apply on a database built from the current migration set.
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            CONTINUE;
        END IF;
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
-- The index only makes sense on the tables that exist: the migration set is
-- applied on databases built from different subsets, so a missing table must
-- not abort the whole migration.
DO $$
DECLARE
    spec record;
BEGIN
    FOR spec IN SELECT * FROM (VALUES
        ('idx_rls_coach_ai_suggestions', 'ai_suggestions', 'coach_id'),
        ('idx_rls_coach_assigned_workouts', 'assigned_workouts', 'coach_id'),
        ('idx_rls_coach_athlete_memberships', 'athlete_memberships', 'coach_id'),
        ('idx_rls_coach_blog_posts', 'blog_posts', 'coach_id'),
        ('idx_rls_coach_challenges', 'challenges', 'coach_id'),
        ('idx_rls_coach_coach_athlete_links', 'coach_athlete_links', 'coach_id'),
        ('idx_rls_coach_coach_athletes', 'coach_athletes', 'coach_id'),
        ('idx_rls_coach_coach_feed_posts', 'coach_feed_posts', 'coach_id'),
        ('idx_rls_coach_coach_sessions', 'coach_sessions', 'coach_id'),
        ('idx_rls_coach_coach_settlements', 'coach_settlements', 'coach_id'),
        ('idx_rls_coach_commission_agreements', 'commission_agreements', 'coach_id'),
        ('idx_rls_coach_daily_summaries', 'daily_summaries', 'coach_id'),
        ('idx_rls_coach_dashboard_metrics', 'dashboard_metrics', 'coach_id'),
        ('idx_rls_coach_events', 'events', 'coach_id'),
        ('idx_rls_coach_exercise_library', 'exercise_library', 'coach_id'),
        ('idx_rls_coach_live_sessions', 'live_sessions', 'coach_id'),
        ('idx_rls_coach_message_threads', 'message_threads', 'coach_id'),
        ('idx_rls_coach_outbox', 'outbox', 'coach_id'),
        ('idx_rls_coach_payment_methods', 'payment_methods', 'coach_id'),
        ('idx_rls_coach_pending_invites', 'pending_invites', 'coach_id'),
        ('idx_rls_coach_plan_distribution', 'plan_distribution', 'coach_id'),
        ('idx_rls_coach_plans', 'plans', 'coach_id'),
        ('idx_rls_coach_products', 'products', 'coach_id'),
        ('idx_rls_coach_programs', 'programs', 'coach_id'),
        ('idx_rls_coach_public_page_config', 'public_page_config', 'coach_id'),
        ('idx_rls_coach_recent_activity', 'recent_activity', 'coach_id'),
        ('idx_rls_coach_revenue_history', 'revenue_history', 'coach_id'),
        ('idx_rls_coach_running_workout_assignments', 'running_workout_assignments', 'coach_id'),
        ('idx_rls_coach_running_workout_templates', 'running_workout_templates', 'coach_id'),
        ('idx_rls_coach_sales', 'sales', 'coach_id'),
        ('idx_rls_coach_store_orders', 'store_orders', 'coach_id'),
        ('idx_rls_coach_support_tickets', 'support_tickets', 'coach_id'),
        ('idx_rls_coach_time_blocks', 'time_blocks', 'coach_id'),
        ('idx_rls_coach_workout_templates', 'workout_templates', 'coach_id'),
        ('idx_rls_user_device_connections', 'device_connections', 'user_id'),
        ('idx_rls_user_posts', 'posts', 'user_id'),
        ('idx_rls_user_push_tokens', 'push_tokens', 'user_id'),
        ('idx_rls_user_running_session_devices', 'running_session_devices', 'user_id'),
        ('idx_rls_user_running_sessions', 'running_sessions', 'user_id'),
        ('idx_rls_user_wearable_oauth_tokens', 'wearable_oauth_tokens', 'user_id')
    ) AS t(idx_name, table_name, columns) LOOP
        IF to_regclass(format('public.%I', spec.table_name)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
            spec.idx_name, spec.table_name, spec.columns);
    END LOOP;
END $$;