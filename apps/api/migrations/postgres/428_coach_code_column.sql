-- 428_coach_code_column.sql
-- Agrega columna coach_code a la tabla coaches para soportar códigos de
-- coach únicos utilizados por el flujo de invitaciones (invite fixture).
-- La columna ya existe en pending_checkouts (migración 422); esta la añade
-- a coaches para que el INSERT del fixture funcione.

ALTER TABLE public.coaches
    ADD COLUMN IF NOT EXISTS coach_code TEXT DEFAULT '';

COMMENT ON COLUMN public.coaches.coach_code IS
  'Código único de coach utilizado por el flujo de invitaciones.';

CREATE INDEX IF NOT EXISTS idx_coaches_coach_code ON public.coaches(coach_code);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coaches TO mr_training_app;
    END IF;
END $$;
