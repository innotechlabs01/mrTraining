# Team Board - MR Training

## TODO
- [ ] T-002: Mobile Athlete Feature Connection — Connect `apps/mobile` features to new Go API endpoints.
- [ ] T-004: Coach Public Landing Pages — Build dynamic public profiles for coaches to sell plans.
- [ ] T-005: Mobile Access Gate — Implement subscription check in mobile app.

## In Progress
- [x] T-003: Commerce System: Plans & Payments — Implement plan management and payment gateway (Stripe/MP) in Backend. — DONE, spec `docs/superpowers/specs/T-003-commerce-plans-payments.md`. Servicios plan/payment/checkout/membership/subscription ya existen y están montados en routes_setup.go:128-237. Verificado: go build ./... OK, go vet ./... limpio, go test comercio (checkout, payment, subscription, membership) OK, go test ./... 60 paquetes sin FAIL.

## Done
- [x] T-006: Coach signup → Wompi → onboarding → dashboard E2E flow — IMPLEMENTED — QA PASS, review PASS, security PASS
- [x] T-007: Hybrid checkout — pay first, register right after — IMPLEMENTED — QA PASS, review PASS after the critical IDOR fix
- [x] T-008: Wompi payment return flow — claim ownership + StatusPaid guards + coach role routing — APPROVED by @user — committed b8daeda, 62b2c72
- [x] T-009: Wompi checkout auto-process on /payment/success + Playwright E2E — APPROVED by @user — committed 7cb5653
- [x] T-010: Mock Clerk useAuth() at React level for auto-claim E2E — APPROVED by @user — committed 7cb5653
- [x] T-011: Coach Landing Canvas (WYSIWYG) + publish sin redeploy — APPROVED by @user (2026-11-17)
- [x] T-012: RLS efectiva en `coach_landing_pages` — DONE, commit `28dde00`
- [x] T-013: Hardening del upload de media — DONE, commit `28dde00`
