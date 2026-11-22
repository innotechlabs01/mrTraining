-- 435_media_objects.sql
-- Create media_objects table to track Cloudflare R2 objects, ownership,
-- visibility, and confirmation status (pending -> ready -> deleted).

CREATE TABLE IF NOT EXISTS public.media_objects (
    id            TEXT PRIMARY KEY,
    object_key    TEXT UNIQUE NOT NULL,
    bucket        TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    coach_id      TEXT NOT NULL DEFAULT '',
    purpose       TEXT NOT NULL,
    visibility    TEXT NOT NULL CHECK (visibility IN ('private', 'tenant', 'public')),
    content_type  TEXT NOT NULL,
    size_bytes    BIGINT NOT NULL CHECK (size_bytes >= 0),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleted')),
    resource_id   TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at  TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_objects_owner_user_id
    ON public.media_objects(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_media_objects_coach_id
    ON public.media_objects(coach_id);

CREATE INDEX IF NOT EXISTS idx_media_objects_status_created_at
    ON public.media_objects(status, created_at);

CREATE INDEX IF NOT EXISTS idx_media_objects_visibility
    ON public.media_objects(visibility);

ALTER TABLE public.media_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_objects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_media_objects_select ON public.media_objects;
CREATE POLICY policy_media_objects_select ON public.media_objects FOR SELECT
USING (
    owner_user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR (
        coach_id <> ''
        AND coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
    )
    OR visibility = 'public'
    OR (
        visibility = 'tenant'
        AND coach_id <> ''
        AND EXISTS (
            SELECT 1
            FROM public.coach_athlete_links cal
            WHERE cal.coach_id = media_objects.coach_id
              AND cal.athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
              AND cal.status = 'active'
        )
    )
    OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS policy_media_objects_insert ON public.media_objects;
CREATE POLICY policy_media_objects_insert ON public.media_objects FOR INSERT
WITH CHECK (
    owner_user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS policy_media_objects_update ON public.media_objects;
CREATE POLICY policy_media_objects_update ON public.media_objects FOR UPDATE
USING (
    owner_user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR (
        coach_id <> ''
        AND coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
    )
    OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin')
)
WITH CHECK (
    owner_user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR (
        coach_id <> ''
        AND coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
    )
    OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS policy_media_objects_delete ON public.media_objects;
CREATE POLICY policy_media_objects_delete ON public.media_objects FOR DELETE
USING (
    owner_user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin')
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_objects TO mr_training_app;
    END IF;
END $$;
