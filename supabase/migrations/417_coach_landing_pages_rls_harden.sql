-- 417_coach_landing_pages_rls_harden.sql
-- Hardening de Row-Level Security en coach_landing_pages.
--
-- 1. FORCE ROW LEVEL SECURITY: ni siquiera el rol propietario de la tabla
--    salta RLS (defensa en profundidad si la app conecta como owner).
-- 2. Policy de lectura pública: cualquier rol puede leer landings publicadas
--    (GET /l/:slug, sin auth). Las no publicadas siguen inaccesibles sin
--    contexto de coach.
--
-- La policy de isolation por coach (416_coach_landing_pages.sql) sigue
-- vigente para escritura y lectura autenticada. Ambas policies se combinan
-- con OR: un coach autenticado lee/escribe las suyas; el público lee solo
-- las publicadas.

ALTER TABLE coach_landing_pages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_landing_pages_public_read ON coach_landing_pages;
CREATE POLICY coach_landing_pages_public_read ON coach_landing_pages
    FOR SELECT
    USING (is_published = true);
