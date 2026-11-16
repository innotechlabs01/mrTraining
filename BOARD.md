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
- [~] T-009: Wompi checkout auto-process on /payment/success + Playwright E2E
  - architect: DONE — root cause: claim() fetch missing credentials: 'include' → 401
  - dev-front: DONE — credentials:include added; redirect_url verified; email prefill; 162/162 unit tests pass; lint passes
  - QA/web: PENDING — final verification of full E2E suite — dispatch pending
  - dev-backend: PENDING — review only (no Go changes needed)
  - ux-ui-designer: PENDING — review only
- [~] T-010: Mock Clerk useAuth() at React level for auto-claim E2E
  - architect: DONE — plan: page.addInitScript() mock of Clerk context before hydration
  - dev-front: DONE — mock implemented via page.addInitScript(); all 3 E2E tests pass; lint passes
  - QA/web: PENDING — final verification of full E2E suite — dispatch pending
  - Code reviewer: PASS — note: isLoaded/load() runtime verification needed via E2E (dev-front confirmed E2E passes)
  - Security hacker: PASS — no critical/high findings; 3 low/medium findings noted (pre-existing secret fallback, hardcoded email/user ID in mock)

## Review

## Done
