#!/usr/bin/env bash
#
# validate-changelog.sh
#
# Pre-commit hook para la rama `dev`.
# Bloquea el commit si se toca código de producción (apps/mobile, apps/web, apps/api)
# y CHANGELOG.md no se actualiza con una entrada válida:
#   - sección de versión presente (## [Unreleased] o ## [X.Y.Z])
#   - al menos una entrada con formato: [área] descripción — @usuario (PR #n)
#
# Uso: se instala como .githooks/pre-commit y se activa con
#   git config core.hooksPath .githooks
#
set -euo pipefail

# --- Solo aplica en la rama dev --------------------------------------------
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "dev" ]; then
  exit 0
fi

# --- Detectar si hay cambios en código de producción -----------------------
prod_changed=0
if git diff --cached --name-only | grep -Eq '^(apps/mobile/|apps/web/|apps/api/)'; then
  prod_changed=1
fi

if [ "$prod_changed" -eq 0 ]; then
  # No toca código de producción: no exige changelog
  exit 0
fi

# --- CHANGELOG.md debe estar modificado ------------------------------------
if ! git diff --cached --name-only | grep -qx 'CHANGELOG.md'; then
  echo "❌ Pre-commit: se detectaron cambios en código de producción pero CHANGELOG.md no está incluido en el commit."
  echo "   Agrega CHANGELOG.md con una entrada del formato: [mo|fe|be|db|in|se|ux] descripción — @usuario (PR #n)"
  exit 1
fi

changelog="CHANGELOG.md"

# --- Debe haber una sección de versión -------------------------------------
if ! grep -Eq '^## \[(Unreleased|[0-9]+\.[0-9]+\.[0-9]+)\]' "$changelog"; then
  echo "❌ Pre-commit: CHANGELOG.md no tiene una sección de versión (## [Unreleased] o ## [X.Y.Z])."
  exit 1
fi

# --- Debe haber al menos una entrada con formato válido --------------------
# Formato esperado: - [área] descripción — @usuario (PR #n)
valid_entry_re='^\- \[(fe|be|db|mo|in|se|ux)\].*— @[A-Za-z0-9_-]+ \(PR #?[0-9]+\)'

if ! grep -Eq "$valid_entry_re" "$changelog"; then
  echo "❌ Pre-commit: CHANGELOG.md no contiene ninguna entrada con formato válido."
  echo "   Formato requerido: - [área] descripción — @usuario (PR #n)"
  echo "   Áreas válidas: fe, be, db, mo, in, se, ux"
  exit 1
fi

echo "✅ Pre-commit: CHANGELOG.md válido (versión + entrada con área, autor y PR)."
exit 0
