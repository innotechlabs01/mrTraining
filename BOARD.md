# Team Board - MR Training

## TODO
- [ ] T-001: Activation of Athlete Handlers in Go API — Implement endpoints for workout logging, metrics, and messaging.
- [ ] T-002: Mobile Athlete Feature Connection — Connect `apps/mobile` features to new Go API endpoints.
- [ ] T-003: Commerce System: Plans & Payments — Implement plan management and payment gateway (Stripe/MP) in Backend.
- [ ] T-004: Coach Public Landing Pages — Build dynamic public profiles for coaches to sell plans.
- [ ] T-005: Mobile Access Gate — Implement subscription check in mobile app.
- [x] T-006: Coach signup → Wompi → onboarding → dashboard E2E flow — IMPLEMENTED (ff51de8, c13416f, 95559a1, c13d81e, 486db53, 70cc21f, f11fb73, bd98d15, 4ed2461, 9cd52d1, 223984b, bcc28c2) — QA PASS, review PASS, security PASS
- [x] T-007: Hybrid checkout — pay first, register right after — IMPLEMENTED (4db470b, e29d302, ab79003) — QA PASS, review PASS, security PASS after the critical IDOR fix

## In Progress

## Review

## Done
- [x] T-009: Auth entry UX — "Empezar gratis" reconoce usuarios existentes; flujos checkout y login separados; plan sobrevive el redirect — APPROVED by @user — commits cc80d0c, d74e842, 1de68c0 (QA PASS 7/7, review PASS, security PASS)
- [x] T-008: Wompi payment return flow broken — redirect to sign-in loses checkout claim, no coach role assigned, user sent to landing instead of dashboard — APPROVED by @user — committed b8daeda
