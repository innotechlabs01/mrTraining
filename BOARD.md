# Team Board - MR Training

## TODO
- [ ] T-001: Activation of Athlete Handlers in Go API — Implement endpoints for workout logging, metrics, and messaging.
- [ ] T-002: Mobile Athlete Feature Connection — Connect `apps/mobile` features to new Go API endpoints.
- [ ] T-003: Commerce System: Plans & Payments — Implement plan management and payment gateway (Stripe/MP) in Backend.
- [ ] T-004: Coach Public Landing Pages — Build dynamic public profiles for coaches to sell plans.
- [ ] T-005: Mobile Access Gate — Implement subscription check in mobile app.
- [x] T-006: Coach signup → Wompi → onboarding → dashboard E2E flow — IMPLEMENTED — QA PASS, review PASS, security PASS
- [x] T-007: Hybrid checkout — pay first, register right after — IMPLEMENTED — QA PASS, review PASS, security PASS after the critical IDOR fix
- [x] T-008: Wompi payment return flow — claim ownership + StatusPaid guards + coach role routing — APPROVED by @user — committed b8daeda, 62b2c72

## In Progress
- [ ] T-011: Coach Landing Canvas (WYSIWYG) + publish sin redeploy — RE-OPENED por code-reviewer (4 bloqueantes: publish no persiste edits, CSS injection en export, XSS por tag/atributo sin validar, mapper acepta no-array). Fix round 5 en curso.

## Review
- [ ] T-011: Coach Landing Canvas (WYSIWYG) + publish sin redeploy — menu "Landing Page" → `/coach/landing-canvas`; editor por bloques con vista previa en vivo; publicar = flag `is_published` en DB (nunca deploy Vercel); `/l/[slug]` renderiza los mismos bloques (WYSIWYG real); export HTML standalone
  - architect: DONE — plan `docs/superpower/plans/T-011-coach-landing-canvas-plan.md`
  - dev-backend: DONE (ctx_2d5c28872150) — commit `1cdc95e` (panic `coach_id` + 13 tests E1-E6)
  - dev-front: DONE (ctx_1805ed95440a) + FIX ROUNDS 1-4 (ctx_f28c8b0022b7, ctx_92a081a3ebb8, ctx_6069de0a50b9, ctx_d2303d2979ff) — commits `a4c6ac5`, `4e711c0`, `b9f198b`, `ff496c9`, `2306a49` (F1-F16 corregidos y verificados por el coordinador)
  - QA: DONE (ctx_03145d40a979 + follow-up ctx_2588c7291581) — PASS con limitaciones: AC1/AC3/AC4/AC10 no verificables en navegador por el auth gate de Clerk; mitigado con 17 tests jsdom del editor
  - code-reviewer: FAIL loop 1 (ctx_3084b94f6fcd) — 4 hallazgos bloqueantes; fix round 5 despachado
  - security-hacker: pendiente

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
