-- 030_users_table.sql
-- Create the users table - Clerk is the source of truth for identity.
-- This table stores application-specific user attributes.

CREATE TABLE IF NOT EXISTS public.users (
    id            TEXT PRIMARY KEY,                    -- Clerk user ID
    email         TEXT NOT NULL,
    name          TEXT NOT NULL,
    avatar_url    TEXT,
    role          TEXT NOT NULL DEFAULT 'athlete',     -- 'coach', 'athlete', 'admin'
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- RLS: users can only access their own row
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

-- Grant permissions to the application role
-- Grant permissions to the application role if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO mr_training_app;
    END IF;
END $$;