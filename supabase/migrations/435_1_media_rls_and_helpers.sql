-- 435_1_media_rls_and_helpers.sql
-- Security definer helpers for media_objects cross-table authorization checks
-- (coach_athlete_links and support_tickets/ticket_messages) so presign-read
-- works reliably under FORCE ROW LEVEL SECURITY for both coaches and athletes.

CREATE OR REPLACE FUNCTION public.has_active_coach_athlete_link(
    p_coach_id TEXT,
    p_athlete_id TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.coach_athlete_links cal
        WHERE cal.coach_id = p_coach_id
          AND cal.athlete_id = p_athlete_id
          AND cal.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_media_ticket_participant(
    p_user_id TEXT,
    p_object_ref TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.support_tickets st
        JOIN public.ticket_messages tm ON tm.ticket_id = st.id
        WHERE tm.image_url = p_object_ref
          AND st.coach_id = p_user_id
    );
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT EXECUTE ON FUNCTION public.has_active_coach_athlete_link(TEXT, TEXT) TO mr_training_app;
        GRANT EXECUTE ON FUNCTION public.is_media_ticket_participant(TEXT, TEXT) TO mr_training_app;
    END IF;
END $$;
