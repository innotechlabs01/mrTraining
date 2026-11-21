-- 429_nutrition_meal_logs.sql
-- Create nutrition_meal_logs table for athlete meal logging.
-- Mirrors the nutrition domain MealLog aggregate.

CREATE TABLE IF NOT EXISTS public.nutrition_meal_logs (
    id          TEXT PRIMARY KEY,
    athlete_id  TEXT NOT NULL,
    meal_type   VARCHAR(50) NOT NULL,
    foods       TEXT NOT NULL DEFAULT '[]',
    macros      TEXT NOT NULL DEFAULT '{}',
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_athlete_id
    ON public.nutrition_meal_logs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_logged_at
    ON public.nutrition_meal_logs(logged_at);

ALTER TABLE public.nutrition_meal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_nutrition_meal_logs_select ON public.nutrition_meal_logs;
CREATE POLICY policy_nutrition_meal_logs_select ON public.nutrition_meal_logs FOR SELECT
USING (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  OR EXISTS (
    SELECT 1
    FROM public.coach_athlete_links cal
    CROSS JOIN LATERAL (SELECT nutrition_meal_logs.athlete_id AS athlete_id) AS row
    WHERE cal.athlete_id = row.athlete_id
      AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
      AND cal.status = 'active'
  )
);

DROP POLICY IF EXISTS policy_nutrition_meal_logs_write ON public.nutrition_meal_logs;
CREATE POLICY policy_nutrition_meal_logs_write ON public.nutrition_meal_logs FOR INSERT
WITH CHECK (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  OR EXISTS (
    SELECT 1
    FROM public.coach_athlete_links cal
    CROSS JOIN LATERAL (SELECT nutrition_meal_logs.athlete_id AS athlete_id) AS row
    WHERE cal.athlete_id = row.athlete_id
      AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
      AND cal.status = 'active'
  )
);

DROP POLICY IF EXISTS policy_nutrition_meal_logs_update ON public.nutrition_meal_logs;
CREATE POLICY policy_nutrition_meal_logs_update ON public.nutrition_meal_logs FOR UPDATE
USING (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  OR EXISTS (
    SELECT 1
    FROM public.coach_athlete_links cal
    CROSS JOIN LATERAL (SELECT nutrition_meal_logs.athlete_id AS athlete_id) AS row
    WHERE cal.athlete_id = row.athlete_id
      AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
      AND cal.status = 'active'
  )
)
WITH CHECK (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  OR EXISTS (
    SELECT 1
    FROM public.coach_athlete_links cal
    CROSS JOIN LATERAL (SELECT nutrition_meal_logs.athlete_id AS athlete_id) AS row
    WHERE cal.athlete_id = row.athlete_id
      AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
      AND cal.status = 'active'
  )
);

DROP POLICY IF EXISTS policy_nutrition_meal_logs_delete ON public.nutrition_meal_logs;
CREATE POLICY policy_nutrition_meal_logs_delete ON public.nutrition_meal_logs FOR DELETE
USING (
  athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  OR EXISTS (
    SELECT 1
    FROM public.coach_athlete_links cal
    CROSS JOIN LATERAL (SELECT nutrition_meal_logs.athlete_id AS athlete_id) AS row
    WHERE cal.athlete_id = row.athlete_id
      AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
      AND cal.status = 'active'
  )
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nutrition_meal_logs TO mr_training_app;
    END IF;
END $$;
