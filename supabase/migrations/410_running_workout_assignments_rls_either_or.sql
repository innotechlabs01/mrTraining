-- PROPOSAL ONLY — NOT APPLIED (Build10.4-B).
-- Switches SELECT RLS on running_workout_assignments from coach-only to
-- either-or: an assignment is visible when it belongs to the current coach OR
-- when it belongs to the current user (athlete) who has an active relationship
-- with that assignment's coach. INSERT/UPDATE/DELETE remain coach-only.
--
-- Apply only after explicit authorization; verify against an empty PostgreSQL
-- database first. This file is intentionally not referenced by any auto-migrate
-- step in this change set.

-- Replace only the SELECT policy for running_workout_assignments.
DROP POLICY IF EXISTS running_workout_assignments_tenant_isolation_sel
  ON public.running_workout_assignments;

CREATE POLICY running_workout_assignments_sel_coach_or_athlete
  ON public.running_workout_assignments FOR SELECT
  USING (
        coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR (
        athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
        AND EXISTS (
            SELECT 1
              FROM public.coach_athlete_links cal
             WHERE cal.coach_id = running_workout_assignments.coach_id
               AND cal.athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
               AND cal.status = 'active'
        )
    )
  );

-- INSERT / UPDATE / DELETE stay coach-only (already present from 405); recreate
-- them here so the SELECT override is self-contained and idempotent.
DROP POLICY IF EXISTS running_workout_assignments_tenant_isolation_ins
  ON public.running_workout_assignments;
CREATE POLICY running_workout_assignments_tenant_isolation_ins
  ON public.running_workout_assignments FOR INSERT
  WITH CHECK (
        coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
  );

DROP POLICY IF EXISTS running_workout_assignments_tenant_isolation_upd
  ON public.running_workout_assignments;
CREATE POLICY running_workout_assignments_tenant_isolation_upd
  ON public.running_workout_assignments FOR UPDATE
  USING (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''))
  WITH CHECK (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''));

DROP POLICY IF EXISTS running_workout_assignments_tenant_isolation_del
  ON public.running_workout_assignments;
CREATE POLICY running_workout_assignments_tenant_isolation_del
  ON public.running_workout_assignments FOR DELETE
  USING (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''));

-- Supporting index for the athlete branch of the SELECT policy.
CREATE INDEX IF NOT EXISTS idx_rls_coach_athlete_links_running_assignment
  ON public.coach_athlete_links (coach_id, athlete_id, status);
