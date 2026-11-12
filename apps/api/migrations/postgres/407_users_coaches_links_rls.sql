-- Final gap closure for Build4: users, coaches and coach_athlete_links.
-- RLS is coach/athlete context-aware and never trusts client-provided IDs.

-- USERS: a user can read/write only their own application row.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_users_select ON public.users;
CREATE POLICY policy_users_select ON public.users
  FOR SELECT USING (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

DROP POLICY IF EXISTS policy_users_write ON public.users;
CREATE POLICY policy_users_write ON public.users
  FOR INSERT WITH CHECK (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

DROP POLICY IF EXISTS policy_users_update ON public.users;
CREATE POLICY policy_users_update ON public.users
  FOR UPDATE USING (id = NULLIF(current_setting('app.current_user_id', true)::text, ''))
  WITH CHECK (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

DROP POLICY IF EXISTS policy_users_delete ON public.users;
CREATE POLICY policy_users_delete ON public.users
  FOR DELETE USING (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

-- COACHES: authenticated self-ownership for updates, published/active
-- coach rows searchable by authenticated users. Admin flows are deferred.
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_coaches_select ON public.coaches;
CREATE POLICY policy_coaches_select ON public.coaches
  FOR SELECT USING (
    id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR is_active = 1
  );

DROP POLICY IF EXISTS policy_coaches_write ON public.coaches;
CREATE POLICY policy_coaches_write ON public.coaches
  FOR INSERT WITH CHECK (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

DROP POLICY IF EXISTS policy_coaches_update ON public.coaches;
CREATE POLICY policy_coaches_update ON public.coaches
  FOR UPDATE USING (id = NULLIF(current_setting('app.current_user_id', true)::text, ''))
  WITH CHECK (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

DROP POLICY IF EXISTS policy_coaches_delete ON public.coaches;
CREATE POLICY policy_coaches_delete ON public.coaches
  FOR DELETE USING (id = NULLIF(current_setting('app.current_user_id', true)::text, ''));

-- COACH_ATHLETE_LINKS: readable/writable only by the involved coach or athlete.
ALTER TABLE public.coach_athlete_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_cal_select_combined ON public.coach_athlete_links;
CREATE POLICY policy_cal_select_combined ON public.coach_athlete_links
  FOR SELECT USING (
     coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
     OR athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  );

DROP POLICY IF EXISTS policy_cal_write_combined ON public.coach_athlete_links;
CREATE POLICY policy_cal_write_combined ON public.coach_athlete_links
  FOR INSERT WITH CHECK (
     coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
     OR athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  );

DROP POLICY IF EXISTS policy_cal_update_combined ON public.coach_athlete_links;
CREATE POLICY policy_cal_update_combined ON public.coach_athlete_links
  FOR UPDATE USING (
     coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
     OR athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  ) WITH CHECK (
     coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
     OR athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  );

DROP POLICY IF EXISTS policy_cal_delete_combined ON public.coach_athlete_links;
CREATE POLICY policy_cal_delete_combined ON public.coach_athlete_links
  FOR DELETE USING (
     coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
     OR athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
  );
