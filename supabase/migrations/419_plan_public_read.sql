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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO mr_training_app;
