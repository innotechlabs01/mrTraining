-- 438_coach_payout_accounts_and_public_event_registrations.sql
-- T-038a: Coach Payout Bank Account + Public Event Registration (No Auth Required)
--   - public.coach_payout_accounts
--   - public.public_event_registrations
-- Includes RLS policies and grants to mr_training_app.

CREATE TABLE IF NOT EXISTS public.coach_payout_accounts (
    coach_id            TEXT PRIMARY KEY,
    bank_name           TEXT NOT NULL,
    account_type        TEXT NOT NULL CHECK (account_type IN ('savings', 'checking', 'nequi', 'daviplata')),
    account_number      TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    document_type       TEXT NOT NULL DEFAULT 'CC',
    document_number     TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.public_event_registrations (
    id         TEXT PRIMARY KEY,
    event_id   TEXT NOT NULL,
    full_name  TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_public_event_registrations_event_id
    ON public.public_event_registrations(event_id, created_at DESC);

-- Row Level Security
ALTER TABLE public.coach_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_payout_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.public_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_event_registrations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_coach_payout_accounts_owner_or_admin ON public.coach_payout_accounts;
CREATE POLICY policy_coach_payout_accounts_owner_or_admin ON public.coach_payout_accounts
    FOR ALL
    USING (
        coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
        OR coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
        OR coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DROP POLICY IF EXISTS policy_public_event_registrations_select ON public.public_event_registrations;
CREATE POLICY policy_public_event_registrations_select ON public.public_event_registrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public_event_registrations.event_id
              AND (
                  e.is_public = true
                  OR e.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
                  OR e.coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
              )
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DROP POLICY IF EXISTS policy_public_event_registrations_insert ON public.public_event_registrations;
CREATE POLICY policy_public_event_registrations_insert ON public.public_event_registrations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public_event_registrations.event_id
              AND e.is_public = true
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DROP POLICY IF EXISTS policy_public_event_registrations_modify ON public.public_event_registrations;
CREATE POLICY policy_public_event_registrations_modify ON public.public_event_registrations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public_event_registrations.event_id
              AND (
                  e.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
                  OR e.coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
              )
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coach_payout_accounts TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_event_registrations TO mr_training_app;
    END IF;
END $$;
