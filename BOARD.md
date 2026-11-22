# Team Board - MR Training

## TODO
- [ ] (none)

## In Progress
- [ ] (none)

## Review
- [ ] (none)

## Done
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
