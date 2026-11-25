-- 439_workout_template_exercises_and_child_tables_rls.sql
-- Adds the missing RLS policy on workout_template_exercises (whose parent
-- workout_templates has RLS policies, while workout_template_exercises had
-- ENABLE ROW LEVEL SECURITY with 0 policies, causing SQLSTATE 42501 on POST
-- /api/v1/workout-templates).

DROP POLICY IF EXISTS policy_workout_template_exercises_tenant_isolation ON public.workout_template_exercises;
CREATE POLICY policy_workout_template_exercises_tenant_isolation ON public.workout_template_exercises
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates wt
            WHERE wt.id = workout_template_exercises.template_id
              AND (
                  wt.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
                  OR wt.coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
              )
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_templates wt
            WHERE wt.id = workout_template_exercises.template_id
              AND (
                  wt.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
                  OR wt.coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
              )
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_template_exercises TO mr_training_app;
    END IF;
END $$;
