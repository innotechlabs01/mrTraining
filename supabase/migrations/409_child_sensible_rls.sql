-- 409_child_sensible_rls.sql (PROPOSAL ONLY; NOT APPLIED)

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_messages_tenant_isolation_sel
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND mt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_messages_tenant_isolation_ins
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND mt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_messages_tenant_isolation_upd
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND mt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND mt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_messages_tenant_isolation_del
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND mt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

-- ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_ticket_messages_tenant_isolation_sel
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND st.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_ticket_messages_tenant_isolation_ins
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND st.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_ticket_messages_tenant_isolation_upd
  ON public.ticket_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND st.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND st.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_ticket_messages_tenant_isolation_del
  ON public.ticket_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND st.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

-- running_gps_points
ALTER TABLE public.running_gps_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_running_gps_points_tenant_isolation_sel
  ON public.running_gps_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_gps_points.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );

CREATE POLICY policy_running_gps_points_tenant_isolation_ins
  ON public.running_gps_points FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_gps_points.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );

CREATE POLICY policy_running_gps_points_tenant_isolation_upd
  ON public.running_gps_points FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_gps_points.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_gps_points.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );

CREATE POLICY policy_running_gps_points_tenant_isolation_del
  ON public.running_gps_points FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_gps_points.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );

-- running_workout_snapshots
ALTER TABLE public.running_workout_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_running_workout_snapshots_sel
  ON public.running_workout_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.running_workout_assignments a
      WHERE a.id = running_workout_snapshots.assignment_id
        AND a.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
    OR EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_workout_snapshots.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );

CREATE POLICY policy_running_workout_snapshots_ins
  ON public.running_workout_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.running_workout_assignments a
      WHERE a.id = running_workout_snapshots.assignment_id
        AND a.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
    AND EXISTS (
      SELECT 1
      FROM public.running_sessions rs
      WHERE rs.id = running_workout_snapshots.session_id
        AND rs.user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );

-- session_exercises
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_session_exercises_tenant_isolation_sel
  ON public.session_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_exercises.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_session_exercises_tenant_isolation_ins
  ON public.session_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_exercises.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_session_exercises_tenant_isolation_upd
  ON public.session_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_exercises.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_exercises.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_session_exercises_tenant_isolation_del
  ON public.session_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_exercises.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

-- session_ai_adjustments
ALTER TABLE public.session_ai_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_session_ai_adjustments_tenant_isolation_sel
  ON public.session_ai_adjustments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_ai_adjustments.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_session_ai_adjustments_tenant_isolation_ins
  ON public.session_ai_adjustments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_ai_adjustments.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_session_ai_adjustments_tenant_isolation_upd
  ON public.session_ai_adjustments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_ai_adjustments.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_ai_adjustments.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );

CREATE POLICY policy_session_ai_adjustments_tenant_isolation_del
  ON public.session_ai_adjustments FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_sessions cs
      WHERE cs.id = session_ai_adjustments.session_id
        AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
  );
