-- 418_public_read_policies_and_grants.sql
-- Grants for tables created after the 414 allowlist, plus permissive read
-- policies so anonymous public landing routes work.
--
-- Context:
-- * /api/v1/* carries a group-wide Clerk auth middleware (main.go), so public
--   landing reads must run through /public/* with no session context set.
-- * RLS context (app.current_user_id / app.current_coach_id) is currently set
--   only inside transactional flows (uow.go, running service) — not at the
--   HTTP layer. Policies that require those settings therefore block the
--   app role entirely for public/admin flows.

-- 1. Grants for tables created in 415/416/417 (mr_training_app is the API role)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_errors TO mr_training_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coach_landing_pages TO mr_training_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.testimonials TO mr_training_app;

-- 2. platform_errors: authorize at the HTTP layer (webhook route is public,
--    CRUD routes are super-admin gated). Replace the session-policy that the
--    application cannot satisfy with an app-role allow-all.
DROP POLICY IF EXISTS platform_errors_super_admin_all ON platform_errors;
CREATE POLICY platform_errors_app_all ON platform_errors
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. coach_landing_pages: anonymous visits to GET /l/:slug need public read
--    of published landings. Coach-isolation policy stays for tenant writes.
DROP POLICY IF EXISTS coach_landing_pages_public_read ON coach_landing_pages;
CREATE POLICY coach_landing_pages_public_read ON coach_landing_pages
    FOR SELECT
    USING (is_published = true);

-- 4. testimonials: public landing reads published testimonials.
DROP POLICY IF EXISTS testimonials_public_read ON testimonials;
CREATE POLICY testimonials_public_read ON testimonials
    FOR SELECT
    USING (is_published = true);
