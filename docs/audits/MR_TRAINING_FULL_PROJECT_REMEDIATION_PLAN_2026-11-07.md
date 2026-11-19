# MR Training — Plan de remediación integral

## Principio
No reabrir componentes certificados sin defecto reproducible. Priorizar el flujo principal y certificación E2E sobre nuevos módulos.

## Prioridades
1. Build11-B4 checkout real Wompi sandbox (CRÍTICO).
2. Super Admin validación Clerk.
3. Coach/Atleta–Training lifecycle certificado (bloqueo `workout_templates` schema).
4. Build11-B3 relación status (bloqueante externo).
5. E2E financiera completa cuando thirds/activation exist.

## Phase A — Blocking cert
- Apply no migrations.
- Prepare seed and cert tests.
- Execute checkout + webhook + server-to-school? external Wompi with tunnel.
- Update docs with real IDs and result.
- Do not use simulated cert.

## Phase B — Training schema
- Inspect exact code/model SQL.
- Determine min fix either code or migration.
- No change yet without explicit auth.

## Phase C — Regression
- go build/vet/tests.
- web/mobile test results.

## Phase D — QA gate
- Re-run only failed/incomplete domains.
- Keep component statuses.
- Mark QA only after all.
