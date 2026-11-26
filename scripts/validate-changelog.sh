#!/usr/bin/env bash
#
# validate-changelog.sh
#
# Valida la entrada de release del CHANGELOG y que todas las apps consuman la
# misma versión:
#   - sección de versión: ## [X.Y.Z] - dd-mm-YYYY
#   - al menos una entrada: [área] descripción — @usuario (PR #n)
#   - versiones sincronizadas en mobile, web y API Go
#
# Modos:
#   (sin args)  usado por .githooks/pre-commit sobre cambios staged en dev
#   --ci       usado por PRs a QA; exige una sección de release nueva
#
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

mode="${1:-}"
changelog="CHANGELOG.md"
release_re='^## \[([0-9]+\.[0-9]+\.[0-9]+)\] - ([0-9]{2}-[0-9]{2}-[0-9]{4})$'
valid_entry_re='^\- \[(fe|be|db|mo|in|se|ux)\].*— @[A-Za-z0-9_-]+ \(PR #?[0-9]+\)'

# --- En commits de dev, solo aplica si el commit toca código de producción ---
if [ "$mode" != "--ci" ]; then
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$current_branch" != "dev" ]; then
    exit 0
  fi
  if ! git diff --cached --name-only | grep -Eq '^(apps/mobile/|apps/web/|apps/api/)'; then
    exit 0
  fi
  if ! git diff --cached --name-only | grep -qx "$changelog"; then
    echo "❌ Pre-commit: cambios en código de producción sin CHANGELOG.md en el commit."
    echo "   Agregá una entrada: - [área] descripción — @usuario (PR #n)"
    exit 1
  fi
fi

if [ ! -f "$changelog" ]; then
  echo "❌ No existe $changelog"
  exit 1
fi

if ! grep -Eq "$valid_entry_re" "$changelog"; then
  echo "❌ CHANGELOG.md no contiene ninguna entrada con formato válido."
  echo "   Formato requerido: - [área] descripción — @usuario (PR #n)"
  echo "   Áreas válidas: fe, be, db, mo, in, se, ux"
  exit 1
fi

release_line="$(grep -Em1 "$release_re" "$changelog" || true)"
if [ -z "$release_line" ]; then
  if [ "$mode" = "--ci" ]; then
    echo "❌ CHANGELOG.md necesita una sección de release: ## [X.Y.Z] - dd-mm-YYYY"
    exit 1
  fi
  echo "✅ Pre-commit: CHANGELOG.md válido (sin release section; acumulando en Unreleased)."
  exit 0
fi

release_version="$(printf '%s\n' "$release_line" | sed -E 's/^## \[([^]]+)\].*/\1/')"
release_date="$(printf '%s\n' "$release_line" | sed -E 's/.* - ([0-9-]+)$/\1/')"

if [[ ! "$release_date" =~ ^[0-9]{2}-[0-9]{2}-[0-9]{4}$ ]]; then
  echo "❌ Fecha de release inválida: $release_date (formato requerido: dd-mm-YYYY)"
  exit 1
fi

mobile_expo="$(node -p "require('./apps/mobile/app.json').expo.version")"
mobile_package="$(node -p "require('./apps/mobile/package.json').version")"
web_package="$(node -p "require('./apps/web/package.json').version")"
web_health="$(sed -nE "s/.*version: '([^']+)'.*/\1/p" apps/web/src/app/api/health/route.ts | head -n 1)"
api_version="$(sed -nE 's/^var Version = "([^"]+)".*/\1/p' apps/api/cmd/api/main.go | head -n 1)"

version_sources=(
  "apps/mobile/app.json=$mobile_expo"
  "apps/mobile/package.json=$mobile_package"
  "apps/web/package.json=$web_package"
  "apps/web/src/app/api/health/route.ts=$web_health"
  "apps/api/cmd/api/main.go=$api_version"
)

for source in "${version_sources[@]}"; do
  file="${source%%=*}"
  value="${source#*=}"
  if [ "$value" != "$release_version" ]; then
    echo "❌ Versión desincronizada: CHANGELOG=$release_version pero $file=$value"
    exit 1
  fi
done

if [ "$mode" = "--ci" ] && [ -n "${GITHUB_BASE_REF:-}" ]; then
  base_ref="origin/$GITHUB_BASE_REF"
  if ! git cat-file -e "${base_ref}:${changelog}" 2>/dev/null; then
    echo "❌ No se pudo leer $changelog desde $base_ref (usa checkout con fetch-depth: 0)"
    exit 1
  fi
  if git diff --quiet "${base_ref}...HEAD" -- "$changelog"; then
    echo "❌ El PR a QA debe agregar una sección de versión nueva en CHANGELOG.md"
    exit 1
  fi
  if git show "${base_ref}:${changelog}" | grep -Fqx "$release_line"; then
    echo "❌ La sección $release_line ya existe en $base_ref; subí la versión para este PR a QA"
    exit 1
  fi
fi

echo "✅ CHANGELOG.md válido: $release_line (versiones sincronizadas en mobile, web y API)."
exit 0
