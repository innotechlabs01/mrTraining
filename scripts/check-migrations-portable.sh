#!/usr/bin/env bash
# scripts/check-migrations-portable.sh
#
# Verifica que el set de migraciones no dependa del entorno.
#
# Una migración que concede permisos a un rol que sólo existe en el stack
# local aborta la cadena en Supabase (QA) con
#   role "mr_training_app" does not exist
# y deja la base a medias. Los permisos tienen que ser CONDICIONALES: el
# grant se aplica cuando el rol existe y se omite cuando no.
#
# Uso: bash scripts/check-migrations-portable.sh [directorio]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${1:-${REPO_ROOT}/apps/api/migrations/postgres}"

if [[ ! -d "$DIR" ]]; then
  echo "❌ migrations directory not found: $DIR" >&2
  exit 1
fi

status=0
checked=0

for file in "$DIR"/*.sql; do
  [[ -e "$file" ]] || continue
  checked=$((checked + 1))

  # Se sacan los bloques DO $$ ... $$: ahí el GRANT puede (debe) estar
  # condicionado por la existencia del rol.
  offenders="$(
    awk '
      /^DO \$\$/            { inblock = 1; next }
      inblock && /^END \$\$;/ { inblock = 0; next }
      inblock                { next }
      { print }
    ' "$file" \
    | grep -nE "(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES).*\b(mr_training_app|postgres)\b" \
    || true
  )"

  if [[ -n "$offenders" ]]; then
    echo "❌ $(basename "$file"): unconditional statement on the application role:"
    echo "$offenders" | sed 's/^/     /'
    status=1
  fi
done

if [[ $status -ne 0 ]]; then
  cat >&2 <<'EOF'

   Un GRANT a un rol inexistente aborta la migración. Envuelvelo en un bloque
   condicional (ver apps/api/migrations/postgres/030_users_table.sql) o creá
   el rol antes de migrar (scripts/ensure-app-role.sh).
EOF
  exit 1
fi

echo "✅ ${checked} migraciones verificadas: ninguna depende de un rol que pueda no existir"
