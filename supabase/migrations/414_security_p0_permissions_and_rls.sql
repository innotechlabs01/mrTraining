-- 414_security_p0_permissions_and_rls.sql
-- Fase P0: Regularización de permisos DML para mr_training_app,
-- políticas RLS para tablas pendientes y contexto tipado para workers/webhooks.

BEGIN;

-- 1. Permisos DML para mr_training_app en las 20 tablas comerciales y de liquidación
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'allies',
        'ally_invitations',
        'ally_locations',
        'ally_members',
        'ally_operation_items',
        'ally_operations',
        'ally_payment_declarations',
        'ally_products',
        'ally_redemptions',
        'ally_services',
        'coach_ally_relationships',
        'coach_payment_records',
        'coach_settlements',
        'commission_agreements',
        'commission_entries',
        'financial_adjustments',
        'financial_audit_events',
        'good',
        'settlement_documents',
        'settlement_items'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        FOREACH tbl IN ARRAY tables LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
                EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO mr_training_app;', tbl);
            END IF;
        END LOOP;
    END IF;
END $$;

-- 2. Contexto tipado para Worker de Outbox (sin bypass general)
-- Actualizar política de outbox para permitir lectura batch a procesos de sistema identificados
ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_tenant_isolation_sel ON public.outbox;
CREATE POLICY outbox_tenant_isolation_sel ON public.outbox FOR SELECT
USING (
    current_setting('app.internal_execution_context', true) = 'system_worker'
    OR (coach_id)::text = NULLIF(current_setting('app.current_coach_id', true), '')
);

DROP POLICY IF EXISTS outbox_tenant_isolation_upd ON public.outbox;
CREATE POLICY outbox_tenant_isolation_upd ON public.outbox FOR UPDATE
USING (
    current_setting('app.internal_execution_context', true) = 'system_worker'
    OR (coach_id)::text = NULLIF(current_setting('app.current_coach_id', true), '')
)
WITH CHECK (
    current_setting('app.internal_execution_context', true) = 'system_worker'
    OR (coach_id)::text = NULLIF(current_setting('app.current_coach_id', true), '')
);

-- 3. RLS en tablas secundarias de entrenamiento (herencia del padre)
-- assigned_workout_exercises
ALTER TABLE public.assigned_workout_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assigned_workout_exercises_rls_sel ON public.assigned_workout_exercises;
CREATE POLICY assigned_workout_exercises_rls_sel ON public.assigned_workout_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.assigned_workouts aw
        WHERE aw.id = assigned_workout_exercises.workout_id
          AND (
            aw.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
            OR aw.athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
          )
    )
);

DROP POLICY IF EXISTS assigned_workout_exercises_rls_dml ON public.assigned_workout_exercises;
CREATE POLICY assigned_workout_exercises_rls_dml ON public.assigned_workout_exercises FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.assigned_workouts aw
        WHERE aw.id = assigned_workout_exercises.workout_id
          AND aw.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.assigned_workouts aw
        WHERE aw.id = assigned_workout_exercises.workout_id
          AND aw.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
);

-- workout_set_logs
-- The table does not carry athlete_id: a set log belongs to a session
-- (workout_session_logs), which carries the athlete and the workout. The
-- scoping goes through that relation, and the coach is reached through the
-- assigned workout of the session.
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workout_set_logs_rls ON public.workout_set_logs;
CREATE POLICY workout_set_logs_rls ON public.workout_set_logs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.workout_session_logs wsl
        WHERE wsl.id = workout_set_logs.session_id
          AND wsl.athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
    OR EXISTS (
        SELECT 1 FROM public.workout_session_logs wsl
        JOIN public.assigned_workouts aw ON aw.id = wsl.workout_id
        WHERE wsl.id = workout_set_logs.session_id
          AND aw.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workout_session_logs wsl
        WHERE wsl.id = workout_set_logs.session_id
          AND wsl.athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
    OR EXISTS (
        SELECT 1 FROM public.workout_session_logs wsl
        JOIN public.assigned_workouts aw ON aw.id = wsl.workout_id
        WHERE wsl.id = workout_set_logs.session_id
          AND aw.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
);

-- workout_exercises
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workout_exercises_rls ON public.workout_exercises;
CREATE POLICY workout_exercises_rls ON public.workout_exercises FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.workout_templates wt
        WHERE wt.id = workout_exercises.workout_id
          AND (
            wt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
            OR wt.is_public = true
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workout_templates wt
        WHERE wt.id = workout_exercises.workout_id
          AND wt.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
);

-- 4. RLS en tablas comerciales y de liquidaciones
-- coach_settlements
ALTER TABLE public.coach_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_settlements_isolation ON public.coach_settlements;
CREATE POLICY coach_settlements_isolation ON public.coach_settlements FOR ALL
USING (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''))
WITH CHECK (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''));

-- settlement_items
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settlement_items_isolation ON public.settlement_items;
CREATE POLICY settlement_items_isolation ON public.settlement_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.coach_settlements cs
        WHERE cs.id = settlement_items.settlement_id
          AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.coach_settlements cs
        WHERE cs.id = settlement_items.settlement_id
          AND cs.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
);

-- coach_ally_relationships
ALTER TABLE public.coach_ally_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_ally_relationships_isolation ON public.coach_ally_relationships;
CREATE POLICY coach_ally_relationships_isolation ON public.coach_ally_relationships FOR ALL
USING (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''))
WITH CHECK (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''));

-- commission_agreements & commission_entries
ALTER TABLE public.commission_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_agreements_isolation ON public.commission_agreements;
CREATE POLICY commission_agreements_isolation ON public.commission_agreements FOR ALL
USING (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''))
WITH CHECK (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''));

ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_entries_isolation ON public.commission_entries;
CREATE POLICY commission_entries_isolation ON public.commission_entries FOR ALL
USING (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''))
WITH CHECK (coach_id = NULLIF(current_setting('app.current_coach_id', true), ''));

-- athlete_profiles (Lectura por atleta o coach activo; edición por propio atleta)
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS athlete_profiles_sel ON public.athlete_profiles;
CREATE POLICY athlete_profiles_sel ON public.athlete_profiles FOR SELECT
USING (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
    OR EXISTS (
        SELECT 1 FROM public.coach_athlete_links cal
        WHERE cal.athlete_id = athlete_profiles.id
          AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
          AND cal.status = 'active'
    )
);

DROP POLICY IF EXISTS athlete_profiles_mod ON public.athlete_profiles;
CREATE POLICY athlete_profiles_mod ON public.athlete_profiles FOR ALL
USING (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
)
WITH CHECK (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
);

-- users (Provisión segura en Webhooks de Clerk)
DROP POLICY IF EXISTS policy_users_select ON public.users;
CREATE POLICY policy_users_select ON public.users FOR SELECT
USING (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
);

DROP POLICY IF EXISTS policy_users_write ON public.users;
CREATE POLICY policy_users_write ON public.users FOR INSERT
WITH CHECK (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
);

DROP POLICY IF EXISTS policy_users_update ON public.users;
CREATE POLICY policy_users_update ON public.users FOR UPDATE
USING (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
)
WITH CHECK (
    id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) = 'clerk_provisioning'
);

COMMIT;
