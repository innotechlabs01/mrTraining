-- 427_super_admin_dashboard_rls.sql
-- Permite al super admin (CRM global) leer todas las filas en las tablas
-- del dashboard cuando no hay contexto de coach/usuario configurado.
-- El AdminHandler usa db.DB directamente (sin UoW ni set_config de
-- app.current_user_id / app.current_coach_id), y está protegido por
-- RequirePlatformSuperAdmin, por lo que solo super admins acceden a estas rutas.
-- Cuando ambos settings están vacíos (NULL o ''), se permiten todas las filas.
--
-- Estas políticas son ADITIVAS: PostgreSQL combina múltiples políticas SELECT
-- con OR, por lo que no rompen las políticas existentes de coach (que requieren
-- current_coach_id / current_user_id específico).

-- USERS: permitir SELECT sin restricciones cuando no hay contexto de usuario.
DROP POLICY IF EXISTS policy_users_select_super_admin ON public.users;
CREATE POLICY policy_users_select_super_admin ON public.users
  FOR SELECT USING (COALESCE(current_setting('app.current_user_id', true), '') = '');

-- COACH_ATHLETE_LINKS: permitir SELECT sin restricciones cuando no hay
-- contexto de coach ni de usuario.
DROP POLICY IF EXISTS policy_cal_select_super_admin ON public.coach_athlete_links;
CREATE POLICY policy_cal_select_super_admin ON public.coach_athlete_links
  FOR SELECT USING (
    COALESCE(current_setting('app.current_coach_id', true), '') = ''
    AND COALESCE(current_setting('app.current_user_id', true), '') = ''
  );

-- WOOMPI_PAYMENT_LEDGER: permitir SELECT sin restricciones cuando no hay
-- contexto de coach, para que el super admin vea ingresos de todos los coaches.
DROP POLICY IF EXISTS policy_wompi_ledger_select_super_admin ON public.wompi_payment_ledger;
CREATE POLICY policy_wompi_ledger_select_super_admin ON public.wompi_payment_ledger
  FOR SELECT USING (COALESCE(current_setting('app.current_coach_id', true), '') = '');

-- ATHLETE_MEMBERSHIPS: permitir SELECT sin restricciones cuando no hay
-- contexto de coach ni de usuario (GetDashboard cuenta membresías globales).
DROP POLICY IF EXISTS policy_athlete_memberships_select_super_admin ON public.athlete_memberships;
CREATE POLICY policy_athlete_memberships_select_super_admin ON public.athlete_memberships
  FOR SELECT USING (
    COALESCE(current_setting('app.current_coach_id', true), '') = ''
    AND COALESCE(current_setting('app.current_user_id', true), '') = ''
  );

-- SUBSCRIPTIONS: permitir SELECT sin restricciones cuando no hay contexto
-- (GetDashboard cuenta coaches por vencer vía suscripciones).
DROP POLICY IF EXISTS policy_subscriptions_select_super_admin ON public.subscriptions;
CREATE POLICY policy_subscriptions_select_super_admin ON public.subscriptions
  FOR SELECT USING (
    COALESCE(current_setting('app.current_coach_id', true), '') = ''
  );

-- PLANS: permitir SELECT sin restricciones cuando no hay contexto de coach.
DROP POLICY IF EXISTS policy_plans_select_super_admin ON public.plans;
CREATE POLICY policy_plans_select_super_admin ON public.plans
  FOR SELECT USING (COALESCE(current_setting('app.current_coach_id', true), '') = '');

-- Grant SELECT sobre estas tablas al rol de aplicación si existe.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT ON TABLE public.users TO mr_training_app;
        GRANT SELECT ON TABLE public.coach_athlete_links TO mr_training_app;
        GRANT SELECT ON TABLE public.wompi_payment_ledger TO mr_training_app;
        GRANT SELECT ON TABLE public.athlete_memberships TO mr_training_app;
        GRANT SELECT ON TABLE public.subscriptions TO mr_training_app;
        GRANT SELECT ON TABLE public.plans TO mr_training_app;
    END IF;
END $$;
