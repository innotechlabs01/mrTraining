# Team Board - MR Training

## TODO
- [ ] (none)

## In Progress
- [ ] (none)

## Review
- [ ] T-039a [P0]: Reopen T-037a — `POST /api/v1/workout-templates` still 500 (request_id `450a0bd3-...`): FK 23503 on `workout_template_exercises_template_id_fkey`; `CreateWorkoutTemplate` did not set `TemplateID` on new exercises. Fix + regression test added; `go build`, `go vet`, `go test ./internal/... -race` PASS. PR #61 (`dev → qa`) open. Pending QA deploy + E2E re-test.
- [ ] T-040a [P1]: `cd-mobile-qa` APK build failure — EAS regenerated `minSdkVersion 24` because `android/` is gitignored, below `androidx.health.connect:connect-client:1.1.0` requirement 26. Committed `minSdkVersion: 26` in `app.json` + regression test; `tsc` and 98 suites / 551 tests PASS. PR #61 (`dev → qa`) open. Pending QA build re-run.

## Done
- [x] T-038a [P1]: Migration `438` (`coach_payout_accounts`, `public_event_registrations`) + Go API `GET/PUT /api/v1/coach/payout-account`, `GET/POST /public/events/:id(/register)`, `GET /api/v1/events/:id/public-registrations` — `go build/vet/test -race` PASS (2026-11-24).
- [x] T-038b [P1]: Web UI for Coach Payout Bank Account (`/coach/earnings`), Public Event Registration (`/event/[id]` without login), `/sign-in` OAuth contrast & onboarding typo fix — `tsc`, `lint` (0 errs), 36/36 suites / 269/269 tests PASS (2026-11-24).
- [x] T-037a [P0]: Fix HTTP 500s on `POST /api/v1/exercises`, `POST /api/v1/workout-templates`, `POST /api/v1/products`, `POST /api/v1/plans` camelCase/snake_case & `earnings-live` SSE auth — `go build/vet/test -race` PASS (2026-11-24).
- [x] T-037b [P1]: Real `/coach/plan` (Mi Membresía + historial + Wompi) + Sidebar link + fixes in `/coach/earnings` (JSX literal), `/coach/ventas` (modal/toast), `/coach/planes` (TRM/payload), `/coach/landing-canvas` (Hero title/subtitle) & `/coach/ally` (`/api/v1/` prefixes) — `tsc`, `lint` (0 errs), 36/36 suites / 269/269 tests PASS (2026-11-24).
- [x] T-036a [P0]: Close Checkout Account Takeover (`/public/checkouts/:id/verify`), Free-Subscription Bypass (`/checkouts/:id/recover`) & Error Webhook Hardening — Approved by @user 2026-11-24. `go build/vet/test -race` PASS (8 new security/sandbox tests).
- [x] T-036b [P1]: Fix Coach Checkout Redirect (`checkout_url`), Harden Auth BFF Headers/Env & Proxy Progress Summary — Approved by @user 2026-11-24. `tsc`, `lint` (0 errs), 36/36 suites / 269/269 tests PASS.
- [x] T-036c [P1]: Mobile QA `eas.json` Parity & `GO_API_PATH_MAP` Prefix-Collision Hardening — Approved by @user 2026-11-24. `tsc`, 97/97 suites / 550/550 tests PASS.
- [x] T-036d [P2]: CI/CD Workflow Hardening (`cd-qa.yml`, `cd-mobile-qa.yml`, `ci-qa.yml`) — Approved by @user 2026-11-24. 4/4 YAML valid.
- [x] T-025: Support & Admin Tickets End-to-End Contract + Coach Support Page Fix — Approved by @user 2026-11-21. Go `admin/tickets` + SuperAdmin guard + `$4`→`$2` fix | Web auth + 6 BFF proxies + `coach/support` activeTicketId | Go/Web tests & build PASS.
- [x] T-026: PostgreSQL Missing Tables, Missing Columns & SQLite-isms Remediation (`landing.go`, `exercise_repository.go`, migration 437) — Approved by @user 2026-11-21. Migration 437 synced & applied (Local + QA) | Go tests PASS.
- [x] T-027: Challenge Leaderboard WebSocket Mount, Multi-Connection Hub & Mobile WS Auth Fix — Approved by @user 2026-11-21. `/challenges/:id/leaderboard/ws` mounted + multi-socket Hub (`-race` PASS) + Mobile `useWsSubscription.ts` (`GO_API_URL` + `?token=`) PASS.
- [x] T-028: Go Backend RBAC, Cross-Tenant IDOR Hardening & Panic Prevention — Approved by @user 2026-11-21. Zero unchecked `c.Locals(...).(string)`, `RequireCoach` + `AthleteHasActiveCoach` + ownership checks + `senderRole` + `plan` SuperAdmin | `go build`, `go vet`, `go test -race` PASS.
- [x] T-029: Web Next.js Proxy, Route Mismatches, Cache-Control & Client Contract Fixes — Approved by @user 2026-11-21. `[...proxy]` query params + `/v1/` dedupe, `proxy-helper` Clerk token, `Cache-Control: private, no-store`, `coaching/*`, `RightPanel`, `FormMetricsDashboard`, `admin/plans`, `videoAnalyticsApi` | `tsc`, `lint`, `test`, `build` PASS.
- [x] T-030: Mobile API Path Mapping & Challenge Creation Contract Fixes — Approved by @user 2026-11-21. `/athlete/progress/summary` → `/progress/summary`, `CoachChallengesScreen` `/coach/challenges`, `CreateChallengeScreen` `end_date` | `tsc`, `eslint` on changed files, 97 Jest suites/546 tests PASS.
- [x] T-031: Wire `admin/billing` & `admin/dashboard` to Go API, prune unbacked admin mocks (`members`, `reports`, `kanban`), dead admin BFFs & unmounted feature hooks — Approved by @user 2026-11-21. `tsc`, `lint`, `test` (35/35 suites, 268/268 tests), `build` (79 pages) PASS.
- [x] T-032: Go Admin SQL crashes (`UpdateAdminPlan`, `PutCommissionTerms`, `formatTimeValue`, `queryCoaches` precedence) & `workout_repository` `LoggedAt` — Approved by @user 2026-11-21. `go build`, `go vet`, `go test -race` PASS.
- [x] T-033: Go Security Hardening (`athlete.go` IDOR + RLS, `error_tracking` divide-by-zero, summary `RequireCoach`, `admin/settings` secret redaction) — Approved by @user 2026-11-21. Go `-race` tests & Web `tsc`/`lint`/`test`/`build` PASS.
- [x] T-034: Coach Athlete Insights (`/coach/users/[id]` training-summary + video-analytics + envelope adapters) & `DELETE /workout-templates/:id` — Approved by @user 2026-11-21. Go `-race` tests & Web `tsc`/`lint`/`test`/`build` PASS.
- [x] T-035: Mobile `videoAnalytics` -> `POST /video-views`, Challenge zero-contrast token fixes & `GO_API_PATH_MAP` cleanup — Approved by @user 2026-11-21 (`tsc` + `eslint` on touched files + 97/97 Jest suites / 546/546 tests PASS; real-device/simulator visual check pending).
- [x] T-018: Carga y consulta de videos e imágenes con Cloudflare R2 y firmas autenticadas (Coach Web → R2, Mobile → URL firmada) — Approved by @user 2026-11-21. Spec: `docs/superpowers/specs/T-018-cloudflare-r2-signed-media.md` | Migrations 435 & 435_1 applied (Local + QA) | Go `go build` + `-race` tests PASS | Web `tsc`/`lint`/`test`/`build` PASS | Mobile `tsc` + 95 Jest suites/538 tests PASS.
- [x] T-019: Android QA buildType (`com.innotechlabssas.mrtraining.qa`), Expo Config Plugin (`google-services` + `firebase-appdistribution-gradle`), `google-services.qa.json` (gitignored), `app.config.js`, `eas.json`, push `projectId` — Approved by @user 2026-11-21. `APP_VARIANT=qa npx expo config` OK | `npx expo prebuild --platform android --clean` OK | `tsc` + 95 Jest suites/538 tests PASS.
- [x] T-020: Mobile QA CD pipeline (`.github/workflows/cd-mobile-qa.yml`) + CI/CD (`ci-qa.yml`, `ci.yml`, `cd-qa.yml` R2 secrets, root `package.json`) — Approved by @user 2026-11-21.
- [x] T-021: Missing PostgreSQL schema (`devices`, `notifications`, `notification_preferences`), `BOOLEAN` SQL fixes & notification IDOR — Approved by @user 2026-11-21. Migration 436 synced & applied (Local + QA) | `go build` + `go vet` + `go test -race` PASS.
- [x] T-022: Go API security hardening (`error_tracking` SuperAdmin guard + `/stats` route order, redundant auth cleanup) — Approved by @user 2026-11-21. `go build` + `go vet` + `go test -race` PASS.
- [x] T-023: Mobile membership/trial/navigation/Meet URL/WS & lint fixes — Approved by @user 2026-11-21. `tsc` + 95 Jest suites/538 tests + `expo lint` PASS.
- [x] T-024: Web security (`auth-token` gate, proxy `Cache-Control: private, no-store`), `/coach/plans`, `useFormMetrics` — Approved by @user 2026-11-21. `tsc` + `lint` + `test` + `build` PASS.
- [x] T-017: Eliminar exposición de Clerk ID en URLs del admin + verificar ingresos wompi_payment_ledger — QA PASS. Code reviewer PASS. Security Hacker PASS (no Critical/High). Approved by @user 2026-11-18. Fix: ToggleSkipSubscription usa coaches.id interno en URL (no Clerk ID), GetDashboard/queryCoaches usan UNION users+coaches, GetRevenueStats c.is_active=1 (INTEGER), frontend toggle usa coach.coach_id, dashboard muestra "ingresos pendientes de confirmación". Commit b094a98, push to dev.

## Review
- [ ] 

## Done
- [x] T-016: Super Admin CRM issues — QA PASS. Code reviewer PASS. Security Hacker PASS. Approved by @user 2026-11-18. Fix: ToggleSkipSubscription fallback to coaches table by id/email (no more 404 for coach-001), GetDashboard and queryCoaches now source from users WHERE role=coach UNION coaches table (coach innotechlabssas@gmail.com visible), coach isolation preserved, all queries parameterized, super admin guard unchanged. Commit ab7032a, push to dev.

## Done
- [x] T-014: Super Admin Dashboard como CRM global — QA PASS (7/7). Code reviewer PASS. Security reviewer PASS (F-01/F-02 FIXED). Approved by @user 2026-11-18.
- [x] T-015: GetRevenueStats CRM global — Architect PASS. Security reviewer PASS (no Critical/High). Approved by @user 2026-11-18. Cambios: crm/repository.go GetRevenueStats (alcance global coaches + atletas activos, ventana 12 meses), admin.go error handling explícito, crm.go super-admin guard, routes_setup.go orden Admin antes CRM, dashboard page.tsx ??→||, migración 427 RLS super admin. Verificado: go build OK, go test ./... OK, tsc OK, pnpm test 249 OK, pnpm build OK.

## In Progress
- [x] T-005: Mobile Access Gate — Implement subscription check in mobile app. — DONE, spec `docs/superpowers/specs/T-005-mobile-access-gate.md`. AccessGate (fail-closed) protege AthleteTabs (Today, History, Events, Recovery, Profile) en Navigation.tsx:142. Verificado: mobile tsc --noEmit OK, Jest 89 suites/505 tests PASS (incluye AccessGate.test.tsx).

## Done
- [x] T-001: Activation of Athlete Handlers in Go API — Implement endpoints for workout logging, metrics, and messaging. — DONE, spec `docs/superpowers/specs/T-001-athlete-handlers.md`. Código ya existía y está verificado: `go build ./...` OK, `go test ./...` 60 paquetes OK sin FAIL.
- [x] T-002: Mobile Athlete Feature Connection — Connect `apps/mobile` features to new Go API endpoints. — DONE, spec `docs/superpowers/specs/T-002-mobile-athlete-connection.md`. Contrato mobile→API verificado. Entrada muerta del path map eliminada. Verificado: mobile tsc OK, Jest 89 suites/505 tests PASS, API verde.
- [x] T-003: Commerce System: Plans & Payments — Implement plan management and payment gateway (Stripe/MP) in Backend. — DONE, spec `docs/superpowers/specs/T-003-commerce-plans-payments.md`. Servicios plan/payment/checkout/membership/subscription montados en routes_setup.go:128-237. go build/vet/test verdes.
- [x] T-004: Coach Public Landing Pages — Build dynamic public profiles for coaches to sell plans. — DONE, spec `docs/superpowers/specs/T-004-coach-public-landing-pages.md`. /l/[slug] renderiza planes publicados del coach (GET /public/coaches/:coachId/plans). pnpm build exit 0, 249/249 tests, lint 0, tsc OK.

## Done
- [x] T-001: Activation of Athlete Handlers in Go API — Implement endpoints for workout logging, metrics, and messaging. — DONE, spec `docs/superpowers/specs/T-001-athlete-handlers.md`. Código (handlers, services, domain, repo infra, rutas montadas en routes_setup.go:501-504) ya existía y está verificado: `go build ./...` OK, `go vet ./...` limpio, `go test ./...` 60 paquetes OK sin FAIL.
- [x] T-002: Mobile Athlete Feature Connection — Connect `apps/mobile` features to new Go API endpoints. — DONE, spec `docs/superpowers/specs/T-002-mobile-athlete-connection.md`. Contrato mobile→API verificado (cada endpoint consumido existe en routes.go). Eliminada entrada muerta del path map. Verificado: mobile tsc --noEmit OK, Jest 89 suites/505 tests PASS, API go build/vet/test verdes.

## Done
- [x] T-006: Coach signup → Wompi → onboarding → dashboard E2E flow — IMPLEMENTED — QA PASS, review PASS, security PASS
- [x] T-007: Hybrid checkout — pay first, register right after — IMPLEMENTED — QA PASS, review PASS after the critical IDOR fix
- [x] T-008: Wompi payment return flow — claim ownership + StatusPaid guards + coach role routing — APPROVED by @user — committed b8daeda, 62b2c72
- [x] T-009: Wompi checkout auto-process on /payment/success + Playwright E2E — APPROVED by @user — committed 7cb5653
- [x] T-010: Mock Clerk useAuth() at React level for auto-claim E2E — APPROVED by @user — committed 7cb5653
- [x] T-011: Coach Landing Canvas (WYSIWYG) + publish sin redeploy — APPROVED by @user (2026-11-17)
- [x] T-012: RLS efectiva en `coach_landing_pages` — DONE, commit `28dde00`
- [x] T-013: Hardening del upload de media — DONE, commit `28dde00`
