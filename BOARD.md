# Team Board - MR Training

## TODO
- [ ] T-004: Coach Public Landing Pages — Build dynamic public profiles for coaches to sell plans.
- [ ] T-005: Mobile Access Gate — Implement subscription check in mobile app.

## In Progress

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
