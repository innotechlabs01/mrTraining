#!/usr/bin/env bash
# scripts/migrate-all.sh
#
# Aplica las migraciones de PostgreSQL pendientes tanto en el entorno local
# como en la base de datos de Supabase QA.
# Sincroniza previamente apps/api/migrations/postgres y supabase/migrations.

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================================="
echo "  MR TRAINING — Sincronización y Aplicación de Migraciones"
echo "=========================================================="

# 1. Sincronizar directorios de migración
echo "🔄 [1/3] Sincronizando migraciones entre API y Supabase..."
bash "${REPO_ROOT}/scripts/sync-migrations.sh" --fix

# 2. Migración local (si Docker o Postgres local está disponible)
LOCAL_DB_URL="${LOCAL_DATABASE_URL:-postgresql://mr_training_app:MrTrainingApp_LocalOnly_!2026@127.0.0.1:5436/mr_training?sslmode=disable}"
echo "📦 [2/3] Aplicando migraciones en base de datos local..."
if (cd "${REPO_ROOT}/apps/api" && DATABASE_URL="${LOCAL_DB_URL}" go run ./cmd/migrate -dir migrations/postgres); then
    echo "✅ Migraciones locales aplicadas con éxito."
else
    echo "⚠️ No se pudo conectar a la base local en ${LOCAL_DB_URL}. Asegúrate de que Docker esté corriendo."
fi

# 3. Migración en Supabase QA
SUPABASE_QA_URL="${SUPABASE_DATABASE_URL:-postgresql://postgres:KKMJRUluuyC2spCU@db.gqipolozqustybfcoqlf.supabase.co:5432/postgres?sslmode=require}"
echo "🚀 [3/3] Aplicando migraciones en Supabase QA..."
if (cd "${REPO_ROOT}/apps/api" && DATABASE_URL="${SUPABASE_QA_URL}" go run ./cmd/migrate -dir migrations/postgres); then
    echo "✅ Migraciones en Supabase QA aplicadas con éxito."
else
    echo "⚠️ Falló la conexión directa a Supabase QA. Verifique la conexión de red (IPv6/Pooler o firewall)."
fi

echo "=========================================================="
echo "  Migraciones completadas."
echo "=========================================================="
