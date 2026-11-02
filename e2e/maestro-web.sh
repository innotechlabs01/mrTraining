#!/usr/bin/env bash
# Runs Maestro web (chromium) flows with credentials from e2e/credentials.env.
# Web flows use `url:` in the flow config (not appId:) — platform is auto-detected.
# Maestro does NOT inherit shell env — every var is forwarded via -e flags.
# Usage: ./e2e/maestro-web.sh <flow-file-or-dir> [extra maestro args]
#   e.g. ./e2e/maestro-web.sh e2e/public-event-rsvp.yaml --headless
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDENTIALS_FILE="${REPO_ROOT}/e2e/credentials.env"

if [ ! -f "${CREDENTIALS_FILE}" ]; then
  echo "ERROR: ${CREDENTIALS_FILE} not found."
  echo "Run: cp e2e/credentials.env.example e2e/credentials.env  (and fill real values)"
  exit 1
fi

MAESTRO_ENV_ARGS=()
while IFS='=' read -r key value; do
  case "${key}" in
    ''|\#*) continue ;;
  esac
  MAESTRO_ENV_ARGS+=(-e "${key}=${value}")
done < "${CREDENTIALS_FILE}"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <flow-file-or-dir> [extra maestro args]"
  exit 1
fi

exec maestro test "${MAESTRO_ENV_ARGS[@]}" "$@"
