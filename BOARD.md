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

## Done — Sesión QA unblock (audit fixes)
- [x] 9 migraciones pendientes aplicadas en Turso (019–026: Alianzas, comisiones, settlements) — dry-run: 0 pending
- [x] Web tsc: 0 errores (mapper casts + interfaz AssignedWorkoutExercise + helper getClerkToken)
- [x] jest.config.js: setupFilesAfterSetup typo eliminado (setup fantasma jest-dom no usado — removido)
- [x] Polar.sh removido de las 3 apps (packages/rutas/handler/deps/envs). Pagos = MercadoPago only
- [x] coach/[id]/planes "Elegir plan": dead-end 404 → CTA sign-up con contexto de plan
- [x] Playwright Go API default port 8080 → 9090 (helpers + global-setup)
- [x] /api/coaching/{athletes,events,time-blocks,messages}: stubs TODO → datos reales vía lib/db
- [x] Web lint: 0 errores (fixes Alianzas pre-existentes: jsx-key, no-explicit-any, conditional useEffect)
- [x] Web tests 161/161 + build OK · Go 34 paquetes ok · Mobile 353/353 + tsc 0

## Done — Plan Mejoras Fitness v2 (spec: docs/superpowers/specs/PLAN_MEJORAS_FITNESS.md)
- [x] Auditoría de código 2026-10-18: backend GPS running YA HECHO (b2a72a4), web /running NO existía, mobile no grababa GPS, Garmin 0%, analytics API = código muerto, training-engine web OK
- [x] Plan v2 escrito: 13 sprints (S0–S12), config GPS estándar, RunningRouteMap fixes, Garmin E2E, IA workout detail
- [x] S0: commit working tree (client.ts + RunningRouteMap) — c2b4ec0
- [x] S1–S2: web /running historial + detalle, RunningRouteMap SSR-safe/canvas/fitBounds/thumbnail, LiveRunTracker (b94a519)
- [x] S3: ciclo de vida sesión API — PATCH/DELETE, batch live-location ≤100, rate limit, filtro accuracy >50m (0f5f56a)
- [x] S4: mobile RunRecordingScreen GPS offline-first + historial con mapa (2e76ae0)
- [x] S5: repository analytics SQL real + wire en main.go — /analytics/* ya responden (c39400e)
- [x] S6: training AI service + GET /workouts/:id/ai-insights (72d81d2)
- [x] S7: web athlete workout detail + mobile sección IA con "Ajustar cargas" (6fade8f)
- [x] S8: parser GPX/TCX/FIT + import activities + GarminProvider + POST /webhooks/garmin (fdf5580)
- [x] S9: garmin-bridge mobile + Settings wearables + POST /running/sync/garmin (904bbf2)
- [x] S9.1: Apple Watch + Garmin como dispositivos reales — migración 030 (running_session_devices: external_id/source/device_name/device_brand + índice único por atleta), POST /running/sessions/import idempotente, device-identity (resuelve QUÉ reloj grabó desde HealthKit sourceRevision / Health Connect metadata.device), HealthKit lee workouts+ruta de Apple Watch, Health Connect lee ExerciseSession+ruta, Settings muestra el reloj detectado con su nombre real (backend 37 paquetes ok + 3 tests de repo SQLite; mobile tsc 0 + 20 tests)
- [x] S10: check-in matutino (migración 029, GET/POST /checkins, card TodayScreen) (5eb2bb8)
- [x] S11: trial 7 días (POST /memberships/:id/trial + CTA mobile) (ba2abde)
- [ ] S12: App Store Connect — BLOQUEADO (requiere cuenta Apple Developer pagada)
- [ ] Device QA de S4 GPS, S9 Settings, S10 check-in (Maestro + dispositivo) — PASS WITH LIMITATIONS hasta entonces

## Pendiente QA device (VALIDACIÓN AL FINAL, per @user)
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

## QA General
- [x] Builds: Go `go build ./...` OK, Web `next build` OK, Mobile tsc 0
- [x] Tests: Go `go test ./...` OK, Mobile jest 353/353 OK, Web jest 161/161 OK
- [x] Lint: Web lint 0 errores
- [ ] QA device real (Maestro + dispositivo) — pendiente
- [ ] E2E end-to-end — pendiente

## Cierre sesión 2026-10-18 (Plan Mejoras Fitness v2)
- Verificación final completa: Go build+test verdes · Web tsc 0 + lint 0 + jest 161/161 + build OK · Mobile tsc 0 + jest 353/353.
- Sprints S0–S11 entregados y commiteados; S12 bloqueado por cuenta Apple.
- Sin validación en dispositivo real: S4/S9/S10 quedan PASS WITH LIMITATIONS.
