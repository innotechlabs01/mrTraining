#!/usr/bin/env bash
# ==============================================================================
# MR TRAINING — Sincronización Automática e Incremental de Secretos
# (Archivos .env del proyecto → Infisical Local/QA + Google Secret Manager)
# ==============================================================================
# - Si ningún archivo .env cambió, termina inmediatamente sin llamadas de red.
# - Si una variable se agregó o cambió de valor, actualiza SOLO esa variable en
#   Infisical (development / qa) y en Google Secret Manager (mr-training-backend).
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${ROOT_DIR}/.git/infisical-sync-cache"
mkdir -p "$CACHE_DIR"

PROJECT_ID="7218cfde-d9ad-4722-8ffa-9009b1cc40a8"
GCP_PROJECT="mr-training-backend"
INFISICAL_URL="${INFISICAL_BASE_URL:-http://127.0.0.1:80}"
MODE="${1:-all}"

ENV_API_LOCAL="${ROOT_DIR}/apps/api/config/.env.local"
ENV_API_QA="${ROOT_DIR}/apps/api/config/.env.qa"
ENV_WEB_LOCAL="${ROOT_DIR}/apps/web/.env.local"
ENV_MOBILE_LOCAL="${ROOT_DIR}/apps/mobile/.env"
ENV_MOBILE_QA="${ROOT_DIR}/apps/mobile/.env.qa"

sha256_str() {
  printf '%s' "$1" | shasum -a 256 | awk '{print $1}'
}

sha256_files() {
  local combined=""
  for f in "$ENV_API_LOCAL" "$ENV_API_QA" "$ENV_WEB_LOCAL" "$ENV_MOBILE_LOCAL" "$ENV_MOBILE_QA"; do
    if [[ -f "$f" ]]; then
      combined="${combined}$(shasum -a 256 "$f" | awk '{print $1}')"
    fi
  done
  sha256_str "$combined"
}

# 1. Asegurar conectividad de red Docker entre mr-training e innotech-secrets-infisical
if command -v docker >/dev/null 2>&1; then
  docker network inspect infisical-network >/dev/null 2>&1 || docker network create infisical-network >/dev/null 2>&1 || true
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'innotech-secrets-infisical'; then
    if ! docker inspect innotech-secrets-infisical --format '{{json .NetworkSettings.Networks}}' 2>/dev/null | grep -q '"infisical-network"'; then
      docker network connect --alias infisical --alias innotech-secrets-infisical infisical-network innotech-secrets-infisical >/dev/null 2>&1 || true
    fi
  fi
fi

# 2. Fast-path: verificar si algún archivo .env cambió desde la última sincronización exitosa
CURRENT_BUNDLE_HASH="$(sha256_files)"
BUNDLE_CACHE_FILE="${CACHE_DIR}/bundle.sha256"

if [[ "$MODE" != "--force" ]] && [[ -f "$BUNDLE_CACHE_FILE" ]] && [[ "$(cat "$BUNDLE_CACHE_FILE")" == "$CURRENT_BUNDLE_HASH" ]]; then
  echo "✅ [Secret Sync] Sin cambios en archivos .env (Local / QA) — 0 secretos por actualizar."
  exit 0
fi

echo "=========================================================="
echo "  MR TRAINING — Sincronización Incremental de Secretos"
echo "=========================================================="

# Helper: leer valor de una clave en un archivo .env
read_env_key() {
  local file="$1"
  local key="$2"
  [[ ! -f "$file" ]] && return 0
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2- | sed 's/^"//;s/"$//' || true
}

# Helper: obtener bearer token de Infisical (Universal Auth o INFISICAL_TOKEN)
get_infisical_token() {
  if [[ -n "${INFISICAL_TOKEN:-}" ]]; then
    echo "$INFISICAL_TOKEN"
    return 0
  fi
  local cid="${INFISICAL_CLIENT_ID:-$(read_env_key "${ROOT_DIR}/apps/api/.env.local" INFISICAL_CLIENT_ID)}"
  local csec="${INFISICAL_CLIENT_SECRET:-$(read_env_key "${ROOT_DIR}/apps/api/.env.local" INFISICAL_CLIENT_SECRET)}"
  if [[ -n "$cid" && -n "$csec" ]]; then
    local tok
    tok="$(curl -sf --max-time 4 -X POST "${INFISICAL_URL%/}/api/v1/auth/universal-auth/login" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "clientId=${cid}&clientSecret=${csec}" | jq -r '.accessToken // empty' || true)"
    if [[ -n "$tok" ]]; then
      echo "$tok"
      return 0
    fi
  fi
  return 1
}

upsert_infisical_secret_if_changed() {
  local token="$1"
  local env_slug="$2"
  local secret_path="$3"
  local key="$4"
  local val="$5"

  [[ -z "$val" ]] && return 0
  local safe_path="${secret_path//\//_}"
  local key_cache="${CACHE_DIR}/infisical_${env_slug}_${safe_path}_${key}.sha256"
  local val_hash
  val_hash="$(sha256_str "$val")"

  if [[ "$MODE" != "--force" ]] && [[ -f "$key_cache" ]] && [[ "$(cat "$key_cache")" == "$val_hash" ]]; then
    return 0
  fi

  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${INFISICAL_URL%/}/api/v3/secrets/raw/${key}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg ws "$PROJECT_ID" --arg env "$env_slug" --arg sp "$secret_path" --arg v "$val" \
      '{workspaceId:$ws, environment:$env, secretPath:$sp, secretValue:$v}')")"

  if [[ "$code" != "200" ]]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${INFISICAL_URL%/}/api/v3/secrets/raw/${key}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -d "$(jq -nc --arg ws "$PROJECT_ID" --arg env "$env_slug" --arg sp "$secret_path" --arg v "$val" \
        '{workspaceId:$ws, environment:$env, secretPath:$sp, secretValue:$v}')")"
  fi

  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo "$val_hash" > "$key_cache"
    echo "  [INFISICAL ${env_slug}:${secret_path}] Actualizado: $key"
  fi
}

sync_env_file_to_infisical() {
  local file="$1"
  local env_slug="$2"
  local secret_path="$3"
  local token="$4"

  [[ ! -f "$file" ]] && return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local k="${BASH_REMATCH[1]}"
      local v="${BASH_REMATCH[2]}"
      v="${v%\"}"
      v="${v#\"}"
      [[ -z "$v" ]] && continue
      upsert_infisical_secret_if_changed "$token" "$env_slug" "$secret_path" "$k" "$v"
    fi
  done < "$file"
}

upsert_gsm_if_changed() {
  local secret_name="$1"
  local val="$2"
  [[ -z "$val" ]] && return 0

  local key_cache="${CACHE_DIR}/gsm_${secret_name}.sha256"
  local val_hash
  val_hash="$(sha256_str "$val")"

  if [[ "$MODE" != "--force" ]] && [[ -f "$key_cache" ]] && [[ "$(cat "$key_cache")" == "$val_hash" ]]; then
    return 0
  fi

  if ! gcloud secrets describe "$secret_name" --project="$GCP_PROJECT" >/dev/null 2>&1; then
    printf '%s' "$val" | gcloud secrets create "$secret_name" --replication-policy="automatic" --data-file=- --project="$GCP_PROJECT" >/dev/null
    echo "$val_hash" > "$key_cache"
    echo "  [CREADO EN GSM] $secret_name"
  else
    local current
    current="$(gcloud secrets versions access latest --secret="$secret_name" --project="$GCP_PROJECT" 2>/dev/null || true)"
    if [[ "$current" != "$val" ]]; then
      printf '%s' "$val" | gcloud secrets versions add "$secret_name" --data-file=- --project="$GCP_PROJECT" >/dev/null
      echo "  [ACTUALIZADO EN GSM] $secret_name"
    fi
    echo "$val_hash" > "$key_cache"
  fi
}

sync_qa_to_gcp_secret_manager() {
  if ! command -v gcloud >/dev/null 2>&1; then
    return 0
  fi

  # 1. API QA secrets (apps/api/config/.env.qa)
  if [[ -f "$ENV_API_QA" ]]; then
    upsert_gsm_if_changed "DATABASE_URL_QA"                  "$(read_env_key "$ENV_API_QA" DATABASE_URL)"
    upsert_gsm_if_changed "CLERK_PUBLISHABLE_KEY_QA"         "$(read_env_key "$ENV_API_QA" NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
    upsert_gsm_if_changed "CLERK_SECRET_KEY_QA"              "$(read_env_key "$ENV_API_QA" CLERK_SECRET_KEY)"
    upsert_gsm_if_changed "CLERK_WEBHOOK_SECRET_QA"          "$(read_env_key "$ENV_API_QA" CLERK_WEBHOOK_SECRET)"
    upsert_gsm_if_changed "WOMPI_PRIVATE_KEY_QA"             "$(read_env_key "$ENV_API_QA" WOMPI_PRIVATE_KEY)"
    upsert_gsm_if_changed "WOMPI_INTEGRITY_SECRET_QA"        "$(read_env_key "$ENV_API_QA" WOMPI_INTEGRITY_SECRET)"
    upsert_gsm_if_changed "WOMPI_EVENTS_SECRET_QA"           "$(read_env_key "$ENV_API_QA" WOMPI_EVENTS_SECRET)"
    upsert_gsm_if_changed "WOMPI_ENV_QA"                     "$(read_env_key "$ENV_API_QA" WOMPI_ENV)"
    upsert_gsm_if_changed "WOMPI_WEBHOOK_URL_QA"             "$(read_env_key "$ENV_API_QA" WOMPI_WEBHOOK_URL)"
    upsert_gsm_if_changed "APP_URL_QA"                       "$(read_env_key "$ENV_API_QA" APP_URL)"
    upsert_gsm_if_changed "ERROR_WEBHOOK_DISCOR_QA"          "$(read_env_key "$ENV_API_QA" ERROR_WEBHOOK_DISCOR)"
    upsert_gsm_if_changed "REDIS_URL_QA"                     "$(read_env_key "$ENV_API_QA" REDIS_URL)"
    upsert_gsm_if_changed "PLATFORM_SUPER_ADMIN_CLERK_ID_QA" "$(read_env_key "$ENV_API_QA" PLATFORM_SUPER_ADMIN_CLERK_ID)"
    upsert_gsm_if_changed "CORS_ORIGINS_QA"                  "$(read_env_key "$ENV_API_QA" CORS_ORIGINS)"
  fi

  # 2. Mobile QA secrets (apps/mobile/.env.qa)
  if [[ -f "$ENV_MOBILE_QA" ]]; then
    upsert_gsm_if_changed "MOBILE_QA_EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" "$(read_env_key "$ENV_MOBILE_QA" EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)"
    upsert_gsm_if_changed "MOBILE_QA_EXPO_PUBLIC_GO_API_URL"            "$(read_env_key "$ENV_MOBILE_QA" EXPO_PUBLIC_GO_API_URL)"
  fi
}

if TOKEN="$(get_infisical_token)"; then
  sync_env_file_to_infisical "$ENV_API_LOCAL"    "development" "/api"    "$TOKEN"
  sync_env_file_to_infisical "$ENV_WEB_LOCAL"    "development" "/web"    "$TOKEN"
  sync_env_file_to_infisical "$ENV_MOBILE_LOCAL" "development" "/mobile" "$TOKEN"
  sync_env_file_to_infisical "$ENV_API_QA"       "qa"          "/api"    "$TOKEN"
  sync_env_file_to_infisical "$ENV_MOBILE_QA"    "qa"          "/mobile" "$TOKEN"
fi

sync_qa_to_gcp_secret_manager

echo "$CURRENT_BUNDLE_HASH" > "$BUNDLE_CACHE_FILE"
echo "✅ Sincronización incremental de secretos verificada."
