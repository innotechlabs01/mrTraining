-- 431_wearable_oauth_tokens_and_health_sync_fix.sql
-- Fixes wearable_oauth_tokens schema parity with GarminProvider (platform, scope, updated_at, unique constraint)
-- and adds a unique index on athlete_sleep_logs(athlete_id, date, source) so repeated watch syncs are idempotent.

ALTER TABLE public.wearable_oauth_tokens
    ADD COLUMN IF NOT EXISTS platform TEXT,
    ADD COLUMN IF NOT EXISTS scope TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill platform from provider for any legacy rows
UPDATE public.wearable_oauth_tokens
SET platform = provider
WHERE platform IS NULL AND provider IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wearable_oauth_tokens_user_platform
    ON public.wearable_oauth_tokens(user_id, platform);

CREATE UNIQUE INDEX IF NOT EXISTS uq_athlete_sleep_logs_athlete_date_source
    ON public.athlete_sleep_logs(athlete_id, date, source);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wearable_oauth_tokens TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_health_devices TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_health_metrics TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_sleep_logs TO mr_training_app;
    END IF;
END $$;
