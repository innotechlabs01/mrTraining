# MR Training — Auditoría integral del proyecto (2026-11-07)

## Alcance auditado
- `apps/api`
- `apps/web`
- `apps/mobile`
- `apps/api/migrations/postgres` y migraciones aplicadas localmente
- reportes B10, B11, B3/B4, Availability y Super Admin

## Resumen ejecutivo
MR Training tiene una base sólida de seguridad data-layer, con RLS extensivo y UoW parcialmente estandarizado. El flujo de recaudo Wompi ya existe y está disponible, pero todavía no está certificado end-to-end con una transacción real. Pagos a terceros/liquidación automática a más allá de B3 (dependencia externa). El ciclo coach-atleta-training tiene una certificación real solo para Running; el resto necesita E2E o una corrección de esquema/documento.

## Inventario de módulos
Route registry (`apps/api/internal/interfaces/http/routes/routes.go`) incluye: Athlete, User, Earnings, TrainingAI, Training, Membership, Ally, Event, Product, Notification, Running, RunningWorkout, Checkin, Webhooks, Plan, Coach, Selling, Settlement, Product, CoachAtomic, FormMetrics, Challenge, PublicEvents, Public coaching, Support, AllyCatalog, AllyOps, AllyPaymentDeclaration, Policy/CommissionEntry, CoachPaymentRecords, Subscription, Webhooks MP/Wompi, CoachAthlete, Admin, Payment availability.

## Estado por dominio
- Identity/auth (Clerk + tenant): Compilado, cierres parciales, JWT validado en backend.
- Build10 RLS/UoW: CLOSED, excepto restos previamente documentados.
- Coach/Atleta vinculación: controllers allowwted, tests unitarios; falta E2E.
- Training/workouts: implementación extensa; certificación E2E bloqueada por desfase `workout_templates` schema (`code expects goal/estimated_duration_minutes`, DB real `category/difficulty_level/duration_minutes`).
- Running: CLOSED localmente (incl. RLS 410).
- Membership/entitlements: backend authority + web/mobile.
- Payments Wompi: checkout, webhook validation implementados, Availability Gates.
- Ledger B2: cerrado local.
- Pagos a terceros: BLOCKED por Wompi.
- Super Admin: backend+frontend MVP PASS tests/builds; real Clerk JWT external.
- Marketplace economy: provider audit says Wompi viable but real split not tested.

## Seguridad
- Role app no superuser/BYPASSRLS.
- RLS 68 tables, 274 policies.
- UoW set_config transaction-local.
- No literal USING true in target policies.
- 24 tables corrected migration 411 and certified.
- 413 membership read fix validated.

## Architecture/QA
- No broad refactor needed now.
- Workout templates schema mismatch must be resolved before certification. Do not blindly migrate until code usage audited.

## Tests available
- Backend build/vet PASS.
- Integration running/build10 pass under app role.
- SuperAdmin tests pass.
- Web test 145/145 and mobile tests 499/499.

## Blockers
1. Wompi sandbox transaction + webhook + payments E2E certify.
2. Real availability with Wompi...
3. Clerk admin session
4. Wompi third-party enablement and keys.
5. workout templates schema mismatch.

## Classification
- Closed: Build10, Build11-B2, B4A,_migration 413 validation, Entitlements, Web/Mobile B4 local.
- Partial/Blocked: B4 certification, Super Admin, B3, general training E2E.
- Not QA.

