-- 419_plan_public_read.sql
-- HTML landing needs anonymous read of ACTIVE plans (GET /public/plans).
-- plans has RLS with coach-isolation policies requiring app.current_coach_id,
-- which anonymous requests never have — so the public list came back empty.
-- Active plans are public marketing data; the SELECT policy below allows any
-- role with the table grant to read them. Coach isolation remains for the
-- remaining operations (insert/update/delete still share tenant policies).

DROP POLICY IF EXISTS plans_public_read ON plans;
CREATE POLICY plans_public_read ON plans
    FOR SELECT
    USING (is_active = 1);

-- Keep the app role grant explicit for this table (same set as 414).
-- The application role only exists in the local stack: on Supabase the
-- grant has to be skipped instead of aborting the whole migration.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO mr_training_app;
    END IF;
END $$;