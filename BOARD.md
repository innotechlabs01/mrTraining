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

## Review
- [ ] T-011: Coach Landing Canvas (WYSIWYG) + publish sin redeploy — menu "Landing Page" → `/coach/landing-canvas`; editor por bloques con vista previa en vivo; publicar = flag `is_published` en DB (nunca deploy Vercel); `/l/[slug]` renderiza los mismos bloques (WYSIWYG real); export HTML standalone
  - architect: DONE — plan `docs/superpower/plans/T-011-coach-landing-canvas-plan.md`
  - dev-backend: DONE (ctx_2d5c28872150) — commit `1cdc95e` (panic `coach_id` + 13 tests E1-E6)
  - dev-front: DONE (ctx_1805ed95440a) + FIX ROUNDS 1-5 (ctx_f28c8b0022b7, ctx_92a081a3ebb8, ctx_6069de0a50b9, ctx_d2303d2979ff, ctx_d09f977ba6cb) — commits `a4c6ac5`, `4e711c0`, `b9f198b`, `ff496c9`, `2306a49`, `9d69b9f`, `9938ea2`, `2728f26`, `e350b29`, `0ecc4b1` (F1-F16 + R1-R4 corregidos y verificados por el coordinador)
  - QA: DONE (ctx_03145d40a979 + follow-up ctx_2588c7291581) — PASS con limitaciones: AC1/AC3/AC4/AC10 no verificables en navegador por el auth gate de Clerk; mitigado con 17 tests jsdom del editor
  - code-reviewer: RONDA 1 FAIL (ctx_3084b94f6fcd) → 4 bloqueantes corregidos en fix round 5; RONDA 2 (ctx_aa3a8a415dc7) FAIL con 1 bloqueante ADJUDICADO INVALIDO por el coordinador (ver nota abajo)
  - security-hacker: IN PROGRESS (ctx_bfdf2c2acc3b)
  - Nota de adjudicación (code-review ronda 2): el reviewer sostuvo que `onSelectBlock` no funciona porque `CoachLandingDocumentView`/`CoachLandingBlock` son Server Components. Es FALSO: `LivePreview` tiene `'use client'`, asi que su import graph (incluidos esos modulos) se compila en el bundle de CLIENTE. Evidencia del build de produccion: `apps/web/.next/static/chunks/4949-*.js` contiene `onSelectBlock`, `handleClick` (preventDefault/stopPropagation), `role="button"`, `aria-pressed` y la clase `coach-landing-block-selected`, y esa chunk la carga la ruta `/coach/landing-canvas` (app-build-manifest). Si esos componentes fueran Server Components en el grafo del cliente, el build fallaria. No se introduce `'use client'` en el renderer compartido: la pagina publica `/l/[slug]` debe seguir renderizando en servidor (SSR/SEO).

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
