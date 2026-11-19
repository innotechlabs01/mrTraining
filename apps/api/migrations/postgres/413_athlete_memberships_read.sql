-- 413_athlete_memberships_read.sql
-- narrowly permits athlete self-read while retaining coach-only writes
-- for athlete_memberships. This is required for membership/payment checkout
-- without granting cross-tenant access.
--
-- SELECT: athlete owner OR coach owner
-- INSERT/UPDATE/DELETE remain coach-only

BEGIN;

DROP POLICY IF EXISTS athlete_memberships_tenant_isolation_sel
  ON public.athlete_memberships;
DROP POLICY IF EXISTS athlete_memberships_tenant_isolation_ins
  ON public.athlete_memberships;
DROP POLICY IF EXISTS athlete_memberships_tenant_isolation_upd
  ON public.athlete_memberships;
DROP POLICY IF EXISTS athlete_memberships_tenant_isolation_del
  ON public.athlete_memberships;

CREATE POLICY athlete_memberships_rls_sel_self_or_coach
  ON public.athlete_memberships
  FOR SELECT
  USING (
      athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
      OR coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
  );

CREATE POLICY athlete_memberships_rls_ins_coach
  ON public.athlete_memberships
  FOR INSERT
  WITH CHECK (
      coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
  );

CREATE POLICY athlete_memberships_rls_upd_coach
  ON public.athlete_memberships
  FOR UPDATE
  USING (
      coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
  )
  WITH CHECK (
      coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
  );

CREATE POLICY athlete_memberships_rls_del_coach
  ON public.athlete_memberships
  FOR DELETE
  USING (
      coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
  );

COMMIT;
