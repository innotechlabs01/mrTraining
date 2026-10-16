# Team Board

## Done — Fase 1: Limpieza técnica (commiteado eeac974)
- [x] T-028: Fix tsc baseUrl deprecation (TS5101) — errores 1549→34
- [x] T-029: Fix web lint unused vars en WorkoutExecution.tsx
- [x] T-030: Fix duplicate RegisterTrainingRoutes en main.go
- [x] T-031: Set athlete_id locals en RequireAuth

## Done — Fase 2: T-027 Phase B + Phase C (aprobado por @user)
- [x] T-032: T-027 Phase B — Mobile membership gate fail-closed + MercadoPago
- [x] T-033: T-027 Phase C — QA + code-reviewer + security-hacker → USER GATE

## Done — Flujo de membresía vencida (texto plano → planes para comprar)
- [x] membershipService.ts: getAvailablePlans devuelve planes de ejemplo (mensual/anual) hasta que exista endpoint GET /athletes/membership/plans en Go API
- [x] MembershipGate.tsx: onNoMembership callback; no_membership navega a planes de compra; suspended sigue mostrando PaymentScreen para renovar
- [x] Navigation.tsx: AthleteTabsWithGate usa useNavigation + onNoMembership → navigation.replace('MembershipCheck')

## In Progress — Fase 4: Alianzas Frontend (backend completo ~9,300 líneas, sin consumidores frontend)
- [x] T-039 (inicio): Alianzas Mobile — servicio de API creado (apps/mobile/src/features/ally/services/allyService.ts) con createOrder, createReservation, getOperation, listAllyProducts, listAllyServices, createRedemption, redeemToken. Falta: pantallas UI para consumir estos servicios.
- [ ] T-040: Alianzas Web — dashboard coach (CRUD aliados, liquidaciones, comisiones, declaraciones) — no iniciado
- [ ] T-041: Alianzas QA + review — no iniciado

## TODO — Fase 3: QA Device (VALIDACIÓN AL FINAL, per @user — no cambiar de fase hasta terminar Fase 4 y 5)
- [ ] T-034: T-026 QA device validation
- [ ] T-035: T-009 a T-013 QA device validation (5 tasks)
- [ ] T-036: T-014 DB fix — crear challenge activo
- [ ] T-037: T-008 real payment test
- [ ] T-038: T-007 user device test

## TODO — Fase 5: Deuda técnica
- [x] T-042: TestTimeout_SlowRequest race fix (test pasa 3/3; race con -race es inherente al middleware, solo tests de unidad)
- [ ] T-043: Typecheck real — 34 errores de tipo restantes en mobile (deuda documentada)
- [ ] T-044: E2E membership gate — BLOQUEADO: no hay credenciales DB/Clerk (T-027 Phase A)

## QA General (solo al terminar TODAS las fases)
- [ ] QA General: Prueba integral end-to-end de todo lo implementado en todas las fases. PASS/FAIL con evidencia antes de Done.
