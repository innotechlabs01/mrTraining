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
