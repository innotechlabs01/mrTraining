-- athlete_favorites
ALTER TABLE public.athlete_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_favorites_select ON public.athlete_favorites;
DROP POLICY IF EXISTS policy_athlete_favorites_write ON public.athlete_favorites;
DROP POLICY IF EXISTS policy_athlete_favorites_update ON public.athlete_favorites;
DROP POLICY IF EXISTS policy_athlete_favorites_delete ON public.athlete_favorites;
CREATE POLICY policy_athlete_favorites_select ON public.athlete_favorites FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_favorites_write ON public.athlete_favorites FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_favorites_update ON public.athlete_favorites FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_favorites_delete ON public.athlete_favorites FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- athlete_health_devices
ALTER TABLE public.athlete_health_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_health_devices_select ON public.athlete_health_devices;
DROP POLICY IF EXISTS policy_athlete_health_devices_write ON public.athlete_health_devices;
DROP POLICY IF EXISTS policy_athlete_health_devices_update ON public.athlete_health_devices;
DROP POLICY IF EXISTS policy_athlete_health_devices_delete ON public.athlete_health_devices;
CREATE POLICY policy_athlete_health_devices_select ON public.athlete_health_devices FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_health_devices_write ON public.athlete_health_devices FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_health_devices_update ON public.athlete_health_devices FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_health_devices_delete ON public.athlete_health_devices FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- athlete_health_metrics
ALTER TABLE public.athlete_health_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_health_metrics_select ON public.athlete_health_metrics;
DROP POLICY IF EXISTS policy_athlete_health_metrics_write ON public.athlete_health_metrics;
DROP POLICY IF EXISTS policy_athlete_health_metrics_update ON public.athlete_health_metrics;
DROP POLICY IF EXISTS policy_athlete_health_metrics_delete ON public.athlete_health_metrics;
CREATE POLICY policy_athlete_health_metrics_select ON public.athlete_health_metrics FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_health_metrics_write ON public.athlete_health_metrics FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_health_metrics_update ON public.athlete_health_metrics FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_health_metrics_delete ON public.athlete_health_metrics FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- athlete_sleep_logs
ALTER TABLE public.athlete_sleep_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_sleep_logs_select ON public.athlete_sleep_logs;
DROP POLICY IF EXISTS policy_athlete_sleep_logs_write ON public.athlete_sleep_logs;
DROP POLICY IF EXISTS policy_athlete_sleep_logs_update ON public.athlete_sleep_logs;
DROP POLICY IF EXISTS policy_athlete_sleep_logs_delete ON public.athlete_sleep_logs;
CREATE POLICY policy_athlete_sleep_logs_select ON public.athlete_sleep_logs FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_sleep_logs_write ON public.athlete_sleep_logs FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_sleep_logs_update ON public.athlete_sleep_logs FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_sleep_logs_delete ON public.athlete_sleep_logs FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- athlete_weight_history
ALTER TABLE public.athlete_weight_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_weight_history_select ON public.athlete_weight_history;
DROP POLICY IF EXISTS policy_athlete_weight_history_write ON public.athlete_weight_history;
DROP POLICY IF EXISTS policy_athlete_weight_history_update ON public.athlete_weight_history;
DROP POLICY IF EXISTS policy_athlete_weight_history_delete ON public.athlete_weight_history;
CREATE POLICY policy_athlete_weight_history_select ON public.athlete_weight_history FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_weight_history_write ON public.athlete_weight_history FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_weight_history_update ON public.athlete_weight_history FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_athlete_weight_history_delete ON public.athlete_weight_history FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- challenge_attempts
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_challenge_attempts_select ON public.challenge_attempts;
DROP POLICY IF EXISTS policy_challenge_attempts_write ON public.challenge_attempts;
DROP POLICY IF EXISTS policy_challenge_attempts_update ON public.challenge_attempts;
DROP POLICY IF EXISTS policy_challenge_attempts_delete ON public.challenge_attempts;
CREATE POLICY policy_challenge_attempts_select ON public.challenge_attempts FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_challenge_attempts_write ON public.challenge_attempts FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_challenge_attempts_update ON public.challenge_attempts FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_challenge_attempts_delete ON public.challenge_attempts FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- coach_feed_comments
ALTER TABLE public.coach_feed_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_coach_feed_comments_select ON public.coach_feed_comments;
DROP POLICY IF EXISTS policy_coach_feed_comments_write ON public.coach_feed_comments;
DROP POLICY IF EXISTS policy_coach_feed_comments_update ON public.coach_feed_comments;
DROP POLICY IF EXISTS policy_coach_feed_comments_delete ON public.coach_feed_comments;
CREATE POLICY policy_coach_feed_comments_select ON public.coach_feed_comments FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_coach_feed_comments_write ON public.coach_feed_comments FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_coach_feed_comments_update ON public.coach_feed_comments FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_coach_feed_comments_delete ON public.coach_feed_comments FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- coach_feed_reactions
ALTER TABLE public.coach_feed_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_coach_feed_reactions_select ON public.coach_feed_reactions;
DROP POLICY IF EXISTS policy_coach_feed_reactions_write ON public.coach_feed_reactions;
DROP POLICY IF EXISTS policy_coach_feed_reactions_update ON public.coach_feed_reactions;
DROP POLICY IF EXISTS policy_coach_feed_reactions_delete ON public.coach_feed_reactions;
CREATE POLICY policy_coach_feed_reactions_select ON public.coach_feed_reactions FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_coach_feed_reactions_write ON public.coach_feed_reactions FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_coach_feed_reactions_update ON public.coach_feed_reactions FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_coach_feed_reactions_delete ON public.coach_feed_reactions FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- event_athletes
ALTER TABLE public.event_athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_event_athletes_select ON public.event_athletes;
DROP POLICY IF EXISTS policy_event_athletes_write ON public.event_athletes;
DROP POLICY IF EXISTS policy_event_athletes_update ON public.event_athletes;
DROP POLICY IF EXISTS policy_event_athletes_delete ON public.event_athletes;
CREATE POLICY policy_event_athletes_select ON public.event_athletes FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_athletes_write ON public.event_athletes FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_athletes_update ON public.event_athletes FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_athletes_delete ON public.event_athletes FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- event_form_responses
ALTER TABLE public.event_form_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_event_form_responses_select ON public.event_form_responses;
DROP POLICY IF EXISTS policy_event_form_responses_write ON public.event_form_responses;
DROP POLICY IF EXISTS policy_event_form_responses_update ON public.event_form_responses;
DROP POLICY IF EXISTS policy_event_form_responses_delete ON public.event_form_responses;
CREATE POLICY policy_event_form_responses_select ON public.event_form_responses FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_form_responses_write ON public.event_form_responses FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_form_responses_update ON public.event_form_responses FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_form_responses_delete ON public.event_form_responses FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- event_registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_event_registrations_select ON public.event_registrations;
DROP POLICY IF EXISTS policy_event_registrations_write ON public.event_registrations;
DROP POLICY IF EXISTS policy_event_registrations_update ON public.event_registrations;
DROP POLICY IF EXISTS policy_event_registrations_delete ON public.event_registrations;
CREATE POLICY policy_event_registrations_select ON public.event_registrations FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_registrations_write ON public.event_registrations FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_registrations_update ON public.event_registrations FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_event_registrations_delete ON public.event_registrations FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- form_metrics
ALTER TABLE public.form_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_form_metrics_select ON public.form_metrics;
DROP POLICY IF EXISTS policy_form_metrics_write ON public.form_metrics;
DROP POLICY IF EXISTS policy_form_metrics_update ON public.form_metrics;
DROP POLICY IF EXISTS policy_form_metrics_delete ON public.form_metrics;
CREATE POLICY policy_form_metrics_select ON public.form_metrics FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_form_metrics_write ON public.form_metrics FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_form_metrics_update ON public.form_metrics FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_form_metrics_delete ON public.form_metrics FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- form_recordings
ALTER TABLE public.form_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_form_recordings_select ON public.form_recordings;
DROP POLICY IF EXISTS policy_form_recordings_write ON public.form_recordings;
DROP POLICY IF EXISTS policy_form_recordings_update ON public.form_recordings;
DROP POLICY IF EXISTS policy_form_recordings_delete ON public.form_recordings;
CREATE POLICY policy_form_recordings_select ON public.form_recordings FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_form_recordings_write ON public.form_recordings FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_form_recordings_update ON public.form_recordings FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_form_recordings_delete ON public.form_recordings FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- gamification_badges
ALTER TABLE public.gamification_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_gamification_badges_select ON public.gamification_badges;
DROP POLICY IF EXISTS policy_gamification_badges_write ON public.gamification_badges;
DROP POLICY IF EXISTS policy_gamification_badges_update ON public.gamification_badges;
DROP POLICY IF EXISTS policy_gamification_badges_delete ON public.gamification_badges;
CREATE POLICY policy_gamification_badges_select ON public.gamification_badges FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_badges_write ON public.gamification_badges FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_badges_update ON public.gamification_badges FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_badges_delete ON public.gamification_badges FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- gamification_prs
ALTER TABLE public.gamification_prs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_gamification_prs_select ON public.gamification_prs;
DROP POLICY IF EXISTS policy_gamification_prs_write ON public.gamification_prs;
DROP POLICY IF EXISTS policy_gamification_prs_update ON public.gamification_prs;
DROP POLICY IF EXISTS policy_gamification_prs_delete ON public.gamification_prs;
CREATE POLICY policy_gamification_prs_select ON public.gamification_prs FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_prs_write ON public.gamification_prs FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_prs_update ON public.gamification_prs FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_prs_delete ON public.gamification_prs FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- gamification_streaks
ALTER TABLE public.gamification_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_gamification_streaks_select ON public.gamification_streaks;
DROP POLICY IF EXISTS policy_gamification_streaks_write ON public.gamification_streaks;
DROP POLICY IF EXISTS policy_gamification_streaks_update ON public.gamification_streaks;
DROP POLICY IF EXISTS policy_gamification_streaks_delete ON public.gamification_streaks;
CREATE POLICY policy_gamification_streaks_select ON public.gamification_streaks FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_streaks_write ON public.gamification_streaks FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_streaks_update ON public.gamification_streaks FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_streaks_delete ON public.gamification_streaks FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- gamification_workout_days
ALTER TABLE public.gamification_workout_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_gamification_workout_days_select ON public.gamification_workout_days;
DROP POLICY IF EXISTS policy_gamification_workout_days_write ON public.gamification_workout_days;
DROP POLICY IF EXISTS policy_gamification_workout_days_update ON public.gamification_workout_days;
DROP POLICY IF EXISTS policy_gamification_workout_days_delete ON public.gamification_workout_days;
CREATE POLICY policy_gamification_workout_days_select ON public.gamification_workout_days FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_workout_days_write ON public.gamification_workout_days FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_workout_days_update ON public.gamification_workout_days FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_gamification_workout_days_delete ON public.gamification_workout_days FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- leaderboard_entries
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_leaderboard_entries_select ON public.leaderboard_entries;
DROP POLICY IF EXISTS policy_leaderboard_entries_write ON public.leaderboard_entries;
DROP POLICY IF EXISTS policy_leaderboard_entries_update ON public.leaderboard_entries;
DROP POLICY IF EXISTS policy_leaderboard_entries_delete ON public.leaderboard_entries;
CREATE POLICY policy_leaderboard_entries_select ON public.leaderboard_entries FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_leaderboard_entries_write ON public.leaderboard_entries FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_leaderboard_entries_update ON public.leaderboard_entries FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_leaderboard_entries_delete ON public.leaderboard_entries FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- readiness_checkins
ALTER TABLE public.readiness_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_readiness_checkins_select ON public.readiness_checkins;
DROP POLICY IF EXISTS policy_readiness_checkins_write ON public.readiness_checkins;
DROP POLICY IF EXISTS policy_readiness_checkins_update ON public.readiness_checkins;
DROP POLICY IF EXISTS policy_readiness_checkins_delete ON public.readiness_checkins;
CREATE POLICY policy_readiness_checkins_select ON public.readiness_checkins FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_readiness_checkins_write ON public.readiness_checkins FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_readiness_checkins_update ON public.readiness_checkins FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_readiness_checkins_delete ON public.readiness_checkins FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- session_athletes
ALTER TABLE public.session_athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_session_athletes_select ON public.session_athletes;
DROP POLICY IF EXISTS policy_session_athletes_write ON public.session_athletes;
DROP POLICY IF EXISTS policy_session_athletes_update ON public.session_athletes;
DROP POLICY IF EXISTS policy_session_athletes_delete ON public.session_athletes;
CREATE POLICY policy_session_athletes_select ON public.session_athletes FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_session_athletes_write ON public.session_athletes FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_session_athletes_update ON public.session_athletes FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_session_athletes_delete ON public.session_athletes FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- store_purchases
ALTER TABLE public.store_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_store_purchases_select ON public.store_purchases;
DROP POLICY IF EXISTS policy_store_purchases_write ON public.store_purchases;
DROP POLICY IF EXISTS policy_store_purchases_update ON public.store_purchases;
DROP POLICY IF EXISTS policy_store_purchases_delete ON public.store_purchases;
CREATE POLICY policy_store_purchases_select ON public.store_purchases FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_store_purchases_write ON public.store_purchases FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_store_purchases_update ON public.store_purchases FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_store_purchases_delete ON public.store_purchases FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- thread_participants
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_thread_participants_select ON public.thread_participants;
DROP POLICY IF EXISTS policy_thread_participants_write ON public.thread_participants;
DROP POLICY IF EXISTS policy_thread_participants_update ON public.thread_participants;
DROP POLICY IF EXISTS policy_thread_participants_delete ON public.thread_participants;
CREATE POLICY policy_thread_participants_select ON public.thread_participants FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_thread_participants_write ON public.thread_participants FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_thread_participants_update ON public.thread_participants FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_thread_participants_delete ON public.thread_participants FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- video_analytics_sessions
ALTER TABLE public.video_analytics_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_video_analytics_sessions_select ON public.video_analytics_sessions;
DROP POLICY IF EXISTS policy_video_analytics_sessions_write ON public.video_analytics_sessions;
DROP POLICY IF EXISTS policy_video_analytics_sessions_update ON public.video_analytics_sessions;
DROP POLICY IF EXISTS policy_video_analytics_sessions_delete ON public.video_analytics_sessions;
CREATE POLICY policy_video_analytics_sessions_select ON public.video_analytics_sessions FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_video_analytics_sessions_write ON public.video_analytics_sessions FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_video_analytics_sessions_update ON public.video_analytics_sessions FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_video_analytics_sessions_delete ON public.video_analytics_sessions FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));

-- workout_session_logs
ALTER TABLE public.workout_session_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_workout_session_logs_select ON public.workout_session_logs;
DROP POLICY IF EXISTS policy_workout_session_logs_write ON public.workout_session_logs;
DROP POLICY IF EXISTS policy_workout_session_logs_update ON public.workout_session_logs;
DROP POLICY IF EXISTS policy_workout_session_logs_delete ON public.workout_session_logs;
CREATE POLICY policy_workout_session_logs_select ON public.workout_session_logs FOR SELECT USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_workout_session_logs_write ON public.workout_session_logs FOR INSERT WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_workout_session_logs_update ON public.workout_session_logs FOR UPDATE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active')) WITH CHECK (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
CREATE POLICY policy_workout_session_logs_delete ON public.workout_session_logs FOR DELETE USING (athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '') OR EXISTS (SELECT 1 FROM coach_athlete_links cal WHERE cal.athlete_id = athlete_id AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '') AND cal.status='active'));
