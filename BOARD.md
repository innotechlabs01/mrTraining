# Team Board

## Done — Fase 1: Limpieza técnica (commiteado eeac974)
- [x] T-028: Fix tsc baseUrl deprecation (TS5101) — errores 1549→0
- [x] T-029: Fix web lint unused vars en WorkoutExecution.tsx
- [x] T-030: Fix duplicate RegisterTrainingRoutes en main.go
- [x] T-031: Set athlete_id locals en RequireAuth

## Done — Fase 2: T-027 Phase B + Phase C (aprobado por @user)
- [x] T-032: T-027 Phase B — Mobile membership gate fail-closed + MercadoPago
- [x] T-033: T-027 Phase C — QA + code-reviewer + security-hacker → USER GATE

## Done — Flujo de membresía vencida (texto plano → planes para comprar desde BD)
- [x] membershipService.ts mobile: getAvailablePlans() usa GET /athletes/membership/plans (endpoint real, no mock)
- [x] Go API: GET /api/v1/athletes/membership/plans — resuelve coach_id desde coach_athlete_links, devuelve planes activos del coach vinculado al atleta
- [x] Go API: GetCoachIDByAthleteID en invite repo + service + handler
- [x] MembershipGate.tsx: onNoMembership callback; no_membership navega a planes de compra
- [x] Navigation.tsx: AthleteTabsWithGate usa useNavigation + onNoMembership

## Done — Fase 4: Alianzas Frontend (backend ~9,300 líneas)
- [x] T-039 (mobile): allyService.ts + AllyCatalogScreen + AllyOperationsScreen + rutas Navigation
- [x] T-040 (web): allyService.ts + dashboard principal + allies list (CRUD) + catalog + operations pages

## Done — Fase 5: Deuda técnica
- [x] T-042: TestTimeout_SlowRequest race fix (test pasa 3/3; race con -race es inherente al middleware)
- [x] T-043: Typecheck real — 1549 → 0 errores (MediaPipePoseRuntime, PoseRuntime async, useAiWorkout, AiWorkoutScreen, useLogSetFlow.test, ChallengeExecutionScreen, ChallengeDetailScreen, EventsScreen, MyTicketsScreen, TicketChatScreen, NutritionScreen, StoreScreen, HistoryScreen, i18n.ts, client.test.ts)
- [x] T-044: E2E membership gate — BLOQUEADO (sin credenciales DB/Clerk)

## TODO — Fase 3: QA Device (VALIDACIÓN AL FINAL, per @user)
- [ ] T-034: T-026 QA device validation — requiere credenciales Maestro + dispositivo
- [ ] T-035: T-009 a T-013 QA device validation (5 tasks) — requiere credenciales Maestro + dispositivo
- [ ] T-036: T-014 DB fix — crear challenge activo en Turso
- [ ] T-037: T-008 real payment test — requiere credenciales de pago reales
- [ ] T-038: T-007 user device test — requiere dispositivo real

## Done — Fase 4: Alianzas Frontend (GAP aliado→atleta cerrado)
- [x] T-039 (mobile): allyService.ts + AllyCatalogScreen + AllyOperationsScreen + rutas Navigation
- [x] T-040 (web): allyService.ts + dashboard principal + allies list + catalog + operations
- [x] GAP aliado→atleta: GET /athlete/ally/products y GET /athlete/ally/services (RequireAthlete) creados en Go API y conectados en mobile
- [x] PlanModal.tsx: type="button" en botón "Agregar característica" para evitar submit del formulario y cierre del modal
- [x] MembershipCheckScreen.tsx (mobile): si getAvailablePlans() falla (no hay coach vinculado), mostrar no_membership con planes vacíos en lugar de error; distinguir entre "no hay coach vinculado" y "coach sin planes" con mensajes apropiados
- [ ] T-041: Alianzas QA + review

## QA General (en progreso)
- [x] Builds: Go API OK, Mobile tsc OK, Web tsc OK
- [x] Tests: Go API OK, Mobile jest 353/353 OK
- [x] Lint: Web lint OK (solo warnings pre-existentes)
- [ ] QA device real (Maestro + dispositivo) — pendiente
- [ ] E2E end-to-end — pendiente
