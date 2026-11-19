-- 031_users_rls_bypass.sql
-- Allow mr_training_app role to bypass RLS for users table
-- This is needed for system operations like auto-provisioning and service queries

-- Drop and recreate policies with system bypass
DROP POLICY IF EXISTS policy_users_select ON public.users;
CREATE POLICY policy_users_select ON public.users
  FOR SELECT
  USING (
    id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR current_user = 'mr_training_app'
  );

DROP POLICY IF EXISTS policy_users_write ON public.users;
CREATE POLICY policy_users_write ON public.users
  FOR INSERT
  WITH CHECK (
    id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR current_user = 'mr_training_app'
  );

DROP POLICY IF EXISTS policy_users_update ON public.users;
CREATE POLICY policy_users_update ON public.users
  FOR UPDATE
  USING (
    id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR current_user = 'mr_training_app'
  )
  WITH CHECK (
    id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR current_user = 'mr_training_app'
  );

DROP POLICY IF EXISTS policy_users_delete ON public.users;
CREATE POLICY policy_users_delete ON public.users
  FOR DELETE
  USING (
    id = NULLIF(current_setting('app.current_user_id', true)::text, '')
    OR current_user = 'mr_training_app'
  );