# Team Board

## Done — Fase 1: Limpieza técnica (commiteado eeac974)
- [x] T-028: Fix tsc baseUrl deprecation (TS5101) — errores 1549→5
- [x] T-029: Fix web lint unused vars en WorkoutExecution.tsx
- [x] T-030: Fix duplicate RegisterTrainingRoutes en main.go
- [x] T-031: Set athlete_id locals en RequireAuth

## Done — Fase 2: T-027 Phase B + Phase C (aprobado por @user)
- [x] T-032: T-027 Phase B — Mobile membership gate fail-closed + MercadoPago
- [x] T-033: T-027 Phase C — QA + code-reviewer + security-hacker → USER GATE

## Done — Flujo de membresía vencida (texto plano → planes para comprar)
- [x] membershipService.ts: getAvailablePlans devuelve planes de ejemplo (mensual/anual)
- [x] MembershipCheckScreen: muestra planes para comprar cuando no hay membresía
- [x] MembershipGate.tsx: onNoMembership callback; no_membership navega a planes de compra
- [x] Navigation.tsx: AthleteTabsWithGate usa useNavigation + onNoMembership

## In Progress — Fase 4: Alianzas Frontend (backend ~9,300 líneas, sin consumidores frontend)
- [x] T-039 (mobile): allyService.ts + AllyCatalogScreen + AllyOperationsScreen + rutas Navigation
- [ ] T-040: Alianzas Web — dashboard coach (CRUD aliados, liquidaciones, comisiones, declaraciones) — NO INICIADO
- [ ] T-041: Alianzas QA + review — NO INICIADO

## TODO — Fase 3: QA Device (VALIDACIÓN AL FINAL, per @user)
- [ ] T-034: T-026 QA device validation
- [ ] T-035: T-009 a T-013 QA device validation (5 tasks)
- [ ] T-036: T-014 DB fix — crear challenge activo
- [ ] T-037: T-008 real payment test
- [ ] T-038: T-007 user device test

## In Progress — Fase 5: Deuda técnica
- [x] T-042: TestTimeout_SlowRequest race fix (test pasa 3/3; race con -race es inherente al middleware)
- [ ] T-043: Typecheck real — 5 errores restantes (todos MediaPipePoseRuntime — deuda documentada)
- [ ] T-044: E2E membership gate — BLOQUEADO: no hay credenciales DB/Clerk

## QA General (solo al terminar TODAS las fases)
- [ ] QA General: Prueba integral end-to-end de todo lo implementado.
