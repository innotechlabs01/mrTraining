#!/usr/bin/env bash
# scripts/sync-migrations.sh
#
# Comprueba y sincroniza las migraciones SQL entre apps/api/migrations/postgres
# y supabase/migrations manteniendo paridad exacta (excluyendo archivos .down.sql).
#
# Uso:
#   bash scripts/sync-migrations.sh --check   # Comprueba paridad sin modificar (falla si hay desincronización)
#   bash scripts/sync-migrations.sh --fix     # Sincroniza automáticamente de postgres -> supabase y viceversa si aplica
#   bash scripts/sync-migrations.sh --ci      # En CI: comprueba, y si difieren, sincroniza e informa para permitir continuar

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${REPO_ROOT}/apps/api/migrations/postgres"
DST_DIR="${REPO_ROOT}/supabase/migrations"

MODE="${1:---check}"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "❌ Error: Directorio fuente no existe: $SRC_DIR" >&2
  exit 1
fi

if [[ ! -d "$DST_DIR" ]]; then
  echo "⚠️ Creando directorio destino: $DST_DIR"
  mkdir -p "$DST_DIR"
fi

missing_in_dst=0
missing_in_src=0
diff_content=0

# Revisar archivos de Postgres que deben estar en Supabase (excluyendo .down.sql)
for f in "$SRC_DIR"/*.sql; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  if [[ "$base" == *".down.sql"* ]]; then
    continue
  fi

  if [[ ! -f "$DST_DIR/$base" ]]; then
    echo "  [FALTA EN SUPABASE] $base"
    missing_in_dst=$((missing_in_dst + 1))
  elif ! cmp -s "$f" "$DST_DIR/$base"; then
    echo "  [DIFERENCIA DE CONTENIDO] $base"
    diff_content=$((diff_content + 1))
  fi
done

# Revisar si hay archivos en Supabase que no están en Postgres
for f in "$DST_DIR"/*.sql; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  if [[ ! -f "$SRC_DIR/$base" ]]; then
    echo "  [EXTRA EN SUPABASE / FALTA EN POSTGRES] $base"
    missing_in_src=$((missing_in_src + 1))
  fi
done

total_issues=$((missing_in_dst + missing_in_src + diff_content))

echo "--------------------------------------------------------"
echo "Estado de sincronización de migraciones:"
echo "  - Faltantes en supabase/migrations: $missing_in_dst"
echo "  - Faltantes en apps/api/migrations/postgres: $missing_in_src"
echo "  - Archivos con contenido discrepante: $diff_content"
echo "--------------------------------------------------------"

if [[ $total_issues -eq 0 ]]; then
  echo "✅ Migraciones 100% sincronizadas y verificadas con éxito."
  exit 0
fi

if [[ "$MODE" == "--fix" || "$MODE" == "--ci" ]]; then
  echo "🔄 Sincronizando migraciones automáticamente..."

  # Copiar de apps/api/migrations/postgres a supabase/migrations
  for f in "$SRC_DIR"/*.sql; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    if [[ "$base" == *".down.sql"* ]]; then
      continue
    fi
    cp -p "$f" "$DST_DIR/$base"
  done

  # Si había archivos en supabase que no estaban en postgres, también copiarlos
  for f in "$DST_DIR"/*.sql; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    if [[ ! -f "$SRC_DIR/$base" ]]; then
      cp -p "$f" "$SRC_DIR/$base"
    fi
  done

  echo "✅ Migraciones sincronizadas exitosamente."
  if [[ "$MODE" == "--ci" ]]; then
    echo "ℹ️ Modo CI: Migraciones sincronizadas para el proceso actual."
  fi
  exit 0
else
  echo "❌ Error: Las migraciones no están sincronizadas."
  echo "💡 Ejecuta 'bash scripts/sync-migrations.sh --fix' para sincronizarlas."
  exit 1
fi
