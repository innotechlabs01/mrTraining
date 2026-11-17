# Team Board - MR Training

## TODO
- [ ] T-001: Activation of Athlete Handlers in Go API — Implement endpoints for workout logging, metrics, and messaging.
- [ ] T-002: Mobile Athlete Feature Connection — Connect `apps/mobile` features to new Go API endpoints.
- [ ] T-003: Commerce System: Plans & Payments — Implement plan management and payment gateway (Stripe/MP) in Backend.
- [ ] T-004: Coach Public Landing Pages — Build dynamic public profiles for coaches to sell plans.
- [ ] T-005: Mobile Access Gate — Implement subscription check in mobile app.
- [ ] T-013: Hardening del upload de media — `POST /api/v1/landing/media` (`handlers/landing.go:256-279`) valida extensión pero sin límite de tamaño ni verificación de magic bytes (LOW, preexistente, fuera del diff de T-011). IN PROGRESS en esta sesión.

## In Progress
- [x] T-012: RLS efectiva en `coach_landing_pages` — migración `417_coach_landing_pages_rls_harden.sql` (FORCE RLS + policy pública SELECT `is_published=true`) + repo setea `app.current_coach_id` por operación de coach (GetBySlug es público, no lo setea). Tests de integración condicionales (skip sin DATABASE_URL).
- [x] T-006: Coach signup → Wompi → onboarding → dashboard E2E flow — IMPLEMENTED — QA PASS, review PASS, security PASS
- [x] T-007: Hybrid checkout — pay first, register right after — IMPLEMENTED — QA PASS, review PASS, security PASS after the critical IDOR fix
- [x] T-008: Wompi payment return flow — claim ownership + StatusPaid guards + coach role routing — APPROVED by @user — committed b8daeda, 62b2c72

## In Progress

## Done
- [x] T-006: Coach signup → Wompi → onboarding → dashboard E2E flow — IMPLEMENTED — QA PASS, review PASS, security PASS
- [x] T-007: Hybrid checkout — pay first, register right after — IMPLEMENTED — QA PASS, review PASS, security PASS after the critical IDOR fix
- [x] T-008: Wompi payment return flow — claim ownership + StatusPaid guards + coach role routing — APPROVED by @user — committed b8daeda, 62b2c72
- [x] T-009: Wompi checkout auto-process on /payment/success + Playwright E2E — APPROVED by @user — committed 7cb5653
  - architect: DONE — root cause: claim() fetch missing credentials: 'include' → 401
  - dev-front: DONE — credentials:include added; redirect_url verified; email prefill; 162/162 unit tests pass; lint passes
  - QA/web: DONE — 4/4 auto-claim E2E tests pass (email prefill, redirect_url, auto-claim); lint passes
  - Code reviewer: PASS — no blocking issues
  - Security hacker: PASS — no critical/high findings
- [x] T-010: Mock Clerk useAuth() at React level for auto-claim E2E — APPROVED by @user — committed 7cb5653
  - architect: DONE — plan: page.addInitScript() mock of Clerk context before hydration
  - dev-front: DONE — mock implemented via page.addInitScript(); all 3 E2E tests pass; lint passes
  - QA/web: DONE — E2E verified against localhost:3000; all 3 tests pass
  - Code reviewer: PASS — no blocking issues
  - Security hacker: PASS — no critical/high findings
- [x] T-011: Coach Landing Canvas (WYSIWYG) + publish sin redeploy — menu "Landing Page" → `/coach/landing-canvas`; editor por bloques con vista previa en vivo; publicar = flag `is_published` en DB (nunca deploy Vercel); `/l/[slug]` renderiza los mismos bloques (WYSIWYG real); export HTML standalone — APPROVED by @user (2026-11-17)
  - architect: DONE — plan `docs/superpower/plans/T-011-coach-landing-canvas-plan.md`
  - dev-backend: DONE (ctx_2d5c28872150) — commit `1cdc95e` (panic `coach_id` + 13 tests E1-E6)
  - dev-front: DONE + FIX ROUNDS 1-6 — commits `a4c6ac5`, `4e711c0`, `b9f198b`, `ff496c9`, `2306a49`, `9d69b9f`, `9938ea2`, `2728f26`, `e350b29`, `0ecc4b1`, `b5310d2` (F1-F16 + R1-R6 corregidos y verificados por el coordinador)
  - QA: DONE — PASS con limitaciones: AC1/AC3/AC4/AC10 no verificables en navegador por el auth gate de Clerk; mitigado con 20+ tests jsdom del editor (249/249 total)
  - Code reviewer: PASS — ronda 1 (4 bloqueantes, todos corregidos en fix round 5); ronda 2 (1 bloqueante adjudicado inválido: premise RSC incorrecta, refutado con evidencia del build de producción)
  - Security hacker: PASS — sin critical/high; protocol-relative URLs (MEDIUM) corregido en `b5310d2`; RLS decorativa y upload sin límite quedan como T-012/T-013
  - coordinador: verificación final 2026-11-17 — web 249/249 tests, lint 0 errores, `tsc --noEmit` OK, `pnpm build` exit 0 con `/coach/landing-canvas` y `/l/[slug]`; api `go build ./...` OK y `go test ./...` verde
