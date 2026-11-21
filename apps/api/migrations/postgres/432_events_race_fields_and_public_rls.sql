-- 432_events_race_fields_and_public_rls.sql
-- Agrega parámetros completos para eventos y carreras (cupo, precio, fecha límite,
-- categorías de carrera, desnivel y ruta) y corrige políticas RLS para que:
--   1. Los visitantes públicos (anon:<token>) puedan ver eventos públicos y confirmar RSVP.
--   2. El coach dueño del evento pueda ver TODOS los inscritos (atletas + públicos externos).
--   3. Los atletas vinculados puedan ver los eventos de su coach desde mobile.

ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP';
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_deadline TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS running_categories TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS running_elevation_m INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS running_route_url TEXT;

CREATE INDEX IF NOT EXISTS idx_events_public ON events (is_public) WHERE is_public = 1;

-- --- RLS: events (SELECT permite coach dueño, atleta vinculado o evento público) ---
DROP POLICY IF EXISTS events_tenant_isolation_sel ON events;
CREATE POLICY events_tenant_isolation_sel ON events
  FOR SELECT
  USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR is_public = 1
    OR EXISTS (
      SELECT 1 FROM coach_athlete_links cal
      WHERE cal.coach_id = events.coach_id
        AND cal.athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
        AND cal.status = 'active'
    )
  );

-- --- RLS: event_registrations (coach dueño del evento ve atletas + anon:*, y anon:* puede confirmar en eventos públicos) ---
DROP POLICY IF EXISTS policy_event_registrations_select ON event_registrations;
CREATE POLICY policy_event_registrations_select ON event_registrations
  FOR SELECT
  USING (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_registrations.event_id
        AND (
          e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
          OR e.is_public = 1
        )
    )
    OR EXISTS (
      SELECT 1 FROM coach_athlete_links cal
      WHERE cal.athlete_id = event_registrations.athlete_id
        AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
        AND cal.status = 'active'
    )
  );

DROP POLICY IF EXISTS policy_event_registrations_write ON event_registrations;
CREATE POLICY policy_event_registrations_write ON event_registrations
  FOR INSERT
  WITH CHECK (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_registrations.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_registrations.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

DROP POLICY IF EXISTS policy_event_registrations_update ON event_registrations;
CREATE POLICY policy_event_registrations_update ON event_registrations
  FOR UPDATE
  USING (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_registrations.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_registrations.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  )
  WITH CHECK (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_registrations.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_registrations.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

DROP POLICY IF EXISTS policy_event_registrations_delete ON event_registrations;
CREATE POLICY policy_event_registrations_delete ON event_registrations
  FOR DELETE
  USING (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_registrations.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

-- --- RLS: event_form_responses (mismo modelo para respuestas de atletas y visitantes públicos) ---
DROP POLICY IF EXISTS policy_event_form_responses_select ON event_form_responses;
CREATE POLICY policy_event_form_responses_select ON event_form_responses
  FOR SELECT
  USING (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_form_responses.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_form_responses.event_id
          AND e.is_public = 1
      )
    )
  );

DROP POLICY IF EXISTS policy_event_form_responses_write ON event_form_responses;
CREATE POLICY policy_event_form_responses_write ON event_form_responses
  FOR INSERT
  WITH CHECK (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_form_responses.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_form_responses.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

DROP POLICY IF EXISTS policy_event_form_responses_update ON event_form_responses;
CREATE POLICY policy_event_form_responses_update ON event_form_responses
  FOR UPDATE
  USING (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_form_responses.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_form_responses.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  )
  WITH CHECK (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_form_responses.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_form_responses.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

DROP POLICY IF EXISTS policy_event_form_responses_delete ON event_form_responses;
CREATE POLICY policy_event_form_responses_delete ON event_form_responses
  FOR DELETE
  USING (
    athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR (
      athlete_id LIKE 'anon:%'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_form_responses.event_id
          AND e.is_public = 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_form_responses.event_id
        AND e.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

-- Grants idempotentes al rol de aplicación
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON events, event_registrations, event_form_fields, event_form_responses, event_list_items, event_athletes TO mr_training_app;
  END IF;
END $$;
