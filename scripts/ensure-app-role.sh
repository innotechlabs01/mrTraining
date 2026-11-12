#!/usr/bin/env bash
# scripts/ensure-app-role.sh
#
# Crea el rol de la aplicación (mr_training_app) si no existe.
#
# Por qué: el set de migraciones le concede los permisos DML, y un GRANT a un
# rol inexistente aborta la migración. El rol se creaba a mano en cada
# entorno, así que el CI y Supabase no lo tenían.
#
# Es idempotente: si el rol existe no hace nada y no toca los datos.
#
# Uso:
#   DATABASE_URL=postgres://... APP_DB_PASSWORD=... scripts/ensure-app-role.sh
#
# Variables de entorno:
#   DATABASE_URL        (obligatorio) conexión a la base
#   APP_DB_ROLE         nombre del rol (por defecto: mr_training_app)
#   APP_DB_PASSWORD     contraseña del rol; si falta, el rol se crea sin LOGIN
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is required" >&2
  exit 1
fi

ROLE="${APP_DB_ROLE:-mr_training_app}"
PASSWORD="${APP_DB_PASSWORD:-}"

# El SQL usa variables de psql: se pasan con -v.
if ! command -v psql >/dev/null 2>&1; then
  echo "⚠️  psql is not available: skipping the role bootstrap." >&2
  echo "   The migrations skip the grants when the role is missing." >&2
  exit 0
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v app_role="$ROLE" \
  -v app_role_password="$PASSWORD" \
  -f "${SCRIPT_DIR}/ensure-app-role.sql"
