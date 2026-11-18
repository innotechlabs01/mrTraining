-- 426_coach_skip_subscription.sql
-- The super-admin CRM reads and writes coaches.skip_subscription
-- (ListCoaches, GetCoach, ToggleSkipSubscription, the CRM repository and the
-- dashboard "suscripciones omitidas" counter), but no migration ever created the
-- column. GET /api/v1/admin/coaches failed with 500 "failed to list coaches"
-- because the SELECT referenced a non-existent column, and the dashboard
-- silently reported 0 skipped subscriptions because it ignores the query error.
--
-- Additive and idempotent: existing coach rows default to false, so nobody is
-- omitted from billing by accident.

ALTER TABLE public.coaches
    ADD COLUMN IF NOT EXISTS skip_subscription BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.coaches.skip_subscription IS
  'Super admin CRM: true cuando el coach queda omitido del cobro mensual.';

-- The application role owns these columns through the existing coaches grant.
-- The role only exists in the local stack: on Supabase the grant is skipped
-- instead of aborting the whole migration.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coaches TO mr_training_app;
    END IF;
END $$;
