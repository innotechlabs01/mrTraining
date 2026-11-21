-- 430_athlete_form_recording_consent.sql
-- Adds server-side persistence for athlete AI form-recording consent so that
-- app updates, cache clears, or device changes never lose the athlete's choice.

ALTER TABLE public.athlete_profiles
    ADD COLUMN IF NOT EXISTS form_recording_consent VARCHAR(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS form_recording_consent_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.athlete_ai_consents (
    athlete_id  TEXT PRIMARY KEY,
    consent     VARCHAR(20) NOT NULL DEFAULT 'pending',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.athlete_ai_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_athlete_ai_consents_select ON public.athlete_ai_consents;
CREATE POLICY policy_athlete_ai_consents_select ON public.athlete_ai_consents FOR SELECT
USING (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  OR EXISTS (
    SELECT 1
    FROM public.coach_athlete_links cal
    CROSS JOIN LATERAL (SELECT athlete_ai_consents.athlete_id AS athlete_id) AS row
    WHERE cal.athlete_id = row.athlete_id
      AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
      AND cal.status = 'active'
  )
);

DROP POLICY IF EXISTS policy_athlete_ai_consents_write ON public.athlete_ai_consents;
CREATE POLICY policy_athlete_ai_consents_write ON public.athlete_ai_consents FOR INSERT
WITH CHECK (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
);

DROP POLICY IF EXISTS policy_athlete_ai_consents_update ON public.athlete_ai_consents;
CREATE POLICY policy_athlete_ai_consents_update ON public.athlete_ai_consents FOR UPDATE
USING (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
)
WITH CHECK (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_ai_consents TO mr_training_app;
    END IF;
END $$;
