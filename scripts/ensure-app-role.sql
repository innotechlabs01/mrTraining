-- ensure-app-role.sql
-- Bootstrap idempotente del rol de la aplicación.
--
-- El set de migraciones concede los permisos DML al rol de la API
-- (mr_training_app). Ese rol se creaba a mano en cada entorno, que es
-- justamente por qué el CI y Supabase no lo tenían: las migraciones
-- abortaban con 'role "mr_training_app" does not exist'.
--
-- Este script lo crea cuando falta, ANTES de aplicar las migraciones, para
-- que local, CI y QA se comporten igual. Es idempotente: si el rol ya existe
-- no hace nada y no toca los datos.
--
-- Variables de psql:
--   :'app_role'           nombre del rol (mr_training_app)
--   :'app_role_password'  contraseña del rol; si viene vacía, el rol NO se
--                          crea y las migraciones omiten sus grants.
--
-- Ojo: psql no interpola variables dentro de bloques $$ ... $$, por eso el
-- CREATE ROLE se arma con \gexec y no con un DO.

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_role', :'app_role_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role')
  AND :'app_role_password' <> ''
\gexec

SELECT CASE
         WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role')
           THEN 'role ' || :'app_role' || ' listo'
         ELSE 'role ' || :'app_role' || ' NO creado (sin password): las migraciones omitiran sus grants'
       END AS ensure_app_role_result;
