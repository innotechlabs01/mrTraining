-- 436_devices_and_notifications_tables.sql
-- Create missing PostgreSQL tables for the notification domain:
--   - public.devices
--   - public.notifications
--   - public.notification_preferences
-- Includes user-scoped RLS policies (with admin/super_admin/system_worker bypass)
-- and grants to mr_training_app.

CREATE TABLE IF NOT EXISTS public.devices (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    platform   VARCHAR(32) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id
    ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_active
    ON public.devices(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    type       VARCHAR(64) NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    icon       TEXT,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, is_read) WHERE is_read = false;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id           TEXT PRIMARY KEY,
    workout_reminders BOOLEAN NOT NULL DEFAULT true,
    weekly_challenges BOOLEAN NOT NULL DEFAULT true,
    new_articles      BOOLEAN NOT NULL DEFAULT true,
    community_updates BOOLEAN NOT NULL DEFAULT true,
    progress_reports  BOOLEAN NOT NULL DEFAULT true,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_devices_owner_or_admin ON public.devices;
CREATE POLICY policy_devices_owner_or_admin ON public.devices
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DROP POLICY IF EXISTS policy_notifications_owner_or_admin ON public.notifications;
CREATE POLICY policy_notifications_owner_or_admin ON public.notifications
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DROP POLICY IF EXISTS policy_notification_preferences_owner_or_admin ON public.notification_preferences;
CREATE POLICY policy_notification_preferences_owner_or_admin ON public.notification_preferences
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.devices TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO mr_training_app;
    END IF;
END $$;
