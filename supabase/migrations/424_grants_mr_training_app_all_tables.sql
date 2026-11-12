-- 424_grants_mr_training_app_all_tables.sql
-- Otorga permisos DML completos al rol mr_training_app sobre todas las tablas
-- del esquema public (112 tablas actuales). Necesario para que la API funcione
-- con el rol de aplicación en lugar de postgres (BYPASSRLS).
--
-- Contexto: La migración 414 solo otorgó grants sobre 20 tablas comerciales.
-- El resto de tablas (95) quedaban sin permisos, causando 42501 al usar
-- mr_training_app. Esta migración replica los grants que existían en local
-- (de migraciones legacy ya no en el repo) para cubrir las 112 tablas.

BEGIN;

-- 1. Asegurar que el rol existe (lo crea ensure-app-role.sh en CI)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        CREATE ROLE mr_training_app LOGIN NOINHERIT;
        RAISE NOTICE 'Rol mr_training_app creado';
    ELSE
        RAISE NOTICE 'Rol mr_training_app ya existe';
    END IF;
END $$;

-- 2. Grants DML sobre TODAS las tablas del esquema public
DO $$
DECLARE
    tbl record;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        FOR tbl IN
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
        LOOP
            BEGIN
                EXECUTE format(
                    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO mr_training_app;',
                    tbl.table_name
                );
                RAISE NOTICE 'Grant DML en %', tbl.table_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'No se pudo grant en %: %', tbl.table_name, SQLERRM;
            END;
        END LOOP;
    END IF;
END $$;

-- 3. Grants USAGE, SELECT sobre TODAS las secuencias (serial/identity)
DO $$
DECLARE
    seq record;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        FOR seq IN
            SELECT sequence_name
            FROM information_schema.sequences
            WHERE sequence_schema = 'public'
        LOOP
            BEGIN
                EXECUTE format(
                    'GRANT USAGE, SELECT ON SEQUENCE public.%I TO mr_training_app;',
                    seq.sequence_name
                );
                RAISE NOTICE 'Grant sequence en %', seq.sequence_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'No se pudo grant sequence en %: %', seq.sequence_name, SQLERRM;
            END;
        END LOOP;
    END IF;
END $$;

-- 4. Default privileges para futuras tablas/secuencias (solo para el owner que ejecute esto)
-- Nota: Esto requiere ser owner de las tablas futuras. En Supabase el owner es postgres.
-- Se deja comentado; si se desea, ejecutar como postgres:
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mr_training_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO mr_training_app;

COMMIT;