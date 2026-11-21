#!/usr/bin/env bash
# scripts/migrate-all.sh
#
# Sincroniza y aplica las migraciones de PostgreSQL pendientes tanto en el
# entorno local como en Supabase QA (leyendo las URLs desde env vars o desde
# apps/api/config/.env.local y apps/api/config/.env.qa — sin credenciales
# hardcodeadas en git).
#
# Uso:
#   bash scripts/migrate-all.sh            # Sincroniza y aplica migraciones (Local + QA)
#   bash scripts/migrate-all.sh --dry-run  # Verifica pendientes sin aplicar cambios

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN_FLAG=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN_FLAG="-dry-run"
fi

# Lee una variable específica desde un archivo .env sin exportar el resto.
read_env_var() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  local line
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 1
  local val="${line#*=}"
  val="${val%$'\r'}"
  # Quitar comillas dobles o simples envolventes
  val="${val#\"}"
  val="${val%\"}"
  val="${val#\'}"
  val="${val%\'}"
  printf '%s' "$val"
}

mask_url() {
  printf '%s' "$1" | sed -E 's|(://[^:]+:)[^@]+(@)|\1***\2|'
}

echo "=========================================================="
if [[ -n "$DRY_RUN_FLAG" ]]; then
  echo "  MR TRAINING — Verificación de Migraciones (DRY-RUN)"
else
  echo "  MR TRAINING — Sincronización y Aplicación de Migraciones"
fi
echo "=========================================================="

# 1. Sincronizar directorios de migración
echo "🔄 [1/3] Sincronizando migraciones entre API y Supabase..."
if [[ -n "$DRY_RUN_FLAG" ]]; then
  bash "${REPO_ROOT}/scripts/sync-migrations.sh" --check
else
  bash "${REPO_ROOT}/scripts/sync-migrations.sh" --fix
fi

# 2. Migración local (PostgreSQL en Docker)
LOCAL_DB_URL="${LOCAL_DATABASE_URL:-}"
if [[ -z "$LOCAL_DB_URL" ]]; then
  LOCAL_DB_URL="$(read_env_var "${REPO_ROOT}/apps/api/config/.env.local" "DATABASE_URL" || true)"
fi
if [[ -z "$LOCAL_DB_URL" ]]; then
  LOCAL_DB_URL="$(read_env_var "${REPO_ROOT}/apps/api/.env" "DATABASE_URL" || true)"
fi
LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://mr_training_app:MrTrainingApp_LocalOnly_!2026@127.0.0.1:5436/mr_training?sslmode=disable}"

echo "📦 [2/3] Migraciones en base de datos local ($(mask_url "${LOCAL_DB_URL}"))..."
if [[ "$LOCAL_DB_URL" == *"127.0.0.1:5436"* || "$LOCAL_DB_URL" == *"localhost:5436"* ]] && command -v nc >/dev/null 2>&1 && ! nc -z 127.0.0.1 5436 >/dev/null 2>&1; then
  if [[ "${REQUIRE_LOCAL_DB:-0}" == "1" ]]; then
    echo "❌ PostgreSQL local no está escuchando en 127.0.0.1:5436 (REQUIRE_LOCAL_DB=1)." >&2
    exit 1
  fi
  echo "⚠️ PostgreSQL local no está encendido en 127.0.0.1:5436 (Docker detenido); se omite local."
else
  if (cd "${REPO_ROOT}/apps/api" && DATABASE_URL="${LOCAL_DB_URL}" go run ./cmd/migrate -dir migrations/postgres ${DRY_RUN_FLAG}); then
    echo "✅ Base de datos local verificada/actualizada con éxito."
  else
    echo "❌ Error aplicando migraciones en base de datos local." >&2
    exit 1
  fi
fi

# 3. Migración en Supabase QA (lee SUPABASE_DATABASE_URL / DATABASE_URL_QA / apps/api/config/.env.qa)
QA_ENV_FILE="${REPO_ROOT}/apps/api/config/.env.qa"
SUPABASE_QA_URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL_QA:-}}"
if [[ -z "$SUPABASE_QA_URL" ]]; then
  SUPABASE_QA_URL="$(read_env_var "${QA_ENV_FILE}" "SUPABASE_DATABASE_URL" || true)"
fi
if [[ -z "$SUPABASE_QA_URL" ]]; then
  SUPABASE_QA_URL="$(read_env_var "${QA_ENV_FILE}" "DATABASE_URL_QA" || true)"
fi
if [[ -z "$SUPABASE_QA_URL" ]]; then
  SUPABASE_QA_URL="$(read_env_var "${QA_ENV_FILE}" "DATABASE_URL" || true)"
fi

if [[ -z "$SUPABASE_QA_URL" ]]; then
  echo "❌ No se encontró URL de Supabase QA." >&2
  echo "   Define SUPABASE_DATABASE_URL o configura DATABASE_URL_QA en apps/api/config/.env.qa" >&2
  exit 1
fi

if [[ "$SUPABASE_QA_URL" == *"@db."*".supabase.co"* ]]; then
  echo "❌ La URL de Supabase QA apunta al host directo IPv6-only (db.*.supabase.co)." >&2
  echo "   Usa el IPv4 Session Pooler en apps/api/config/.env.qa:" >&2
  echo "   postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require" >&2
  exit 1
fi

echo "🚀 [3/3] Migraciones en Supabase QA ($(mask_url "${SUPABASE_QA_URL}"))..."
if [[ -z "$DRY_RUN_FLAG" && -x "${REPO_ROOT}/scripts/ensure-app-role.sh" ]]; then
  DATABASE_URL="${SUPABASE_QA_URL}" "${REPO_ROOT}/scripts/ensure-app-role.sh" || true
fi

if (cd "${REPO_ROOT}/apps/api" && DATABASE_URL="${SUPABASE_QA_URL}" go run ./cmd/migrate -dir migrations/postgres ${DRY_RUN_FLAG}); then
  echo "✅ Base de datos Supabase QA verificada/actualizada con éxito."
else
  echo "❌ Falló la migración en Supabase QA." >&2
  exit 1
fi

echo "=========================================================="
echo "  Migraciones completadas y verificadas (Local + QA)."
echo "=========================================================="
