-- 421_coach_onboarding_profile.sql
-- Coach onboarding collects sports, experience level, team name, team size and
-- age group. The coaches table had nowhere to store them, so every answer the
-- coach gave in the web onboarding was collected and then discarded.
--
-- The new columns are additive with safe defaults: existing coach rows keep
-- working and the statement is safe to re-run.
--
-- Note: certifications and specializations already exist on coaches as JSON
-- text columns and are reused as-is.

ALTER TABLE public.coaches
    ADD COLUMN IF NOT EXISTS sports TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS team_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS team_size INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS age_group TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS experience_level TEXT NOT NULL DEFAULT '';

-- The application role owns these columns through the existing coaches grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coaches TO mr_training_app;
