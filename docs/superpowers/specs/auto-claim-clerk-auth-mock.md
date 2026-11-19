# Plan: Fix Clerk mock auth for auto-claim E2E test

**Target:** `apps/web/tests/ui/auto-claim.spec.ts` (signed-in coach auto-claim test)
**Role:** Architect — plan only, no code changes
**Constraint:** Do NOT modify production code. Test infrastructure only.

---

## 1. Root cause

`clerk.accounts.dev` returns a 307 preflight CORS response from `localhost:3000`, so the client-side Clerk SDK (`@clerk/nextjs` `useAuth()`) never completes its session check. `isSignedIn` never flips to `true`, so `CheckoutClaim`'s effect never fires `claim()` (POST `/api/checkout/:id/claim`), and no redirect to `/onboarding/coach` happens.

`setup-clerk-coach` already handles server-side auth (Clerk Backend API → `__session` cookie → Next.js middleware + server `auth()`), but it does NOT fix the client-side Clerk SDK's CORS failure. The client needs `useAuth()` mocked.

---

## 2. Decomposition (ordered subtasks)

### Subtask 1 — Survey Clerk client-side endpoint surface (dev-front)
Identify exactly which `clerk.accounts.dev` endpoints `@clerk/nextjs` v6 calls from the browser for `useAuth()` (session/token/payload endpoints). Confirm which responses must be mocked for `useAuth()` to return `{ isSignedIn: true, isLoaded: true, user: { ...coach... }, session: { ... } }`.
- **Boundary:** Read-only investigation. No file changes.

### Subtask 2 — Create `useAuth()` mock helper (dev-front)
Create a test-only helper, e.g. `apps/web/tests/ui/mock-clerk-coach-client.ts`, that uses Playwright `page.route()` to intercept `https://clerk.accounts.dev/**` (Clerk Frontend API / client-side token endpoint) and return mocked signed-in coach-session responses. Equivalent to MSW interception at the network level — this is where the CORS failure occurs.
- **Boundary:** Test infrastructure only. No production imports.
- Deliverable: a reusable `mockClerkCoach(page)` / `mockUseAuth(page)` helper.

### Subtask 3 — Update `auto-claim.spec.ts` signed-in test (dev-front)
Modify the "signed-in coach auto-claims and is redirected to /onboarding/coach" test to:
- Keep `__session` cookie + Bearer header (server-side auth via `setup-clerk-coach` / `addCookies` / `setExtraHTTPHeaders`).
- Call the `useAuth()` mock before/on navigation so the client-side Clerk SDK sees a signed-in session.
- Intercept `**/api/checkout/*/claim`, assert it fires with `credentials: 'include'` (Cookie header present).
- Assert redirect to `/onboarding/coach`.
- Leave the two unauthenticated tests untouched (they use fresh contexts without the mock).
- **Boundary:** Test file only. Do NOT touch `apps/web/src/app/payment/success/page.tsx`.

### Subtask 4 — Wire mock into test setup if needed (dev-front)
If the mock is better expressed as a setup fixture/project (parallel to `setup-clerk-coach`), update `playwright.config.ts` accordingly (new project or `test.use()` fixture). Otherwise, keep the mock invocation inside the spec file's test.
- **Boundary:** `playwright.config.ts` only.

### Subtask 5 — QA verification (qa)
Run the E2E suite against `localhost:3000`:
- Signed-in auto-claim test passes (claim fires, redirect happens).
- No CORS errors from `clerk.accounts.dev` (requests intercepted/mocked).
- Unauthenticated tests still pass (fresh context, no mock).
- **Boundary:** Verification only. No code changes.

---

## 3. Team (roles and order)

| Role | Involvement | When |
|------|-------------|------|
| **dev-front** | Primary implementer | Subtasks 1–4 (sequential) |
| **qa** | Verification | Subtask 5 (after dev-front completes) |
| ux-ui-designer | Not needed | — (no UI changes) |
| dev-backend | Not needed | — (no API/contract changes) |
| dev-flutter | Not needed | — |
| dev-react-native | Not needed | — |

**Execution mode:** dev-front implements; qa verifies. No parallelism needed (single-file, test-infra scope). No branches/worktrees — work on `main` in `mr-training` checkout per AGENTS.md §WORKFLOW OBLIGATORIO.

---

## 4. Acceptance criteria (QA-verifiable with Playwright)

1. **Mock takes effect:** The signed-in coach auto-claim test passes; `useAuth()` returns `isSignedIn: true` without contacting the real `clerk.accounts.dev` client endpoint.
2. **Claim fires:** `POST /api/checkout/:id/claim` is intercepted and invoked with `credentials: 'include'` (Cookie/`__session` header present → `authenticated === true`).
3. **Redirect occurs:** On claim success (200), page URL becomes `/onboarding/coach` (no manual clicks).
4. **No client-side Clerk CORS failures:** No unmocked requests to `clerk.accounts.dev` fail; all are intercepted by the mock.
5. **Unauthenticated flows unaffected:** The sign-in-email-prefill and redirect_url-preservation tests still pass (fresh browser contexts, no auth mock).
6. **No production code modified:** `git diff` shows changes only under `apps/web/tests/` and/or `apps/web/playwright.config.ts`. `apps/web/src/app/payment/success/page.tsx` untouched; `apps/api/` and `apps/mobile/` untouched.

---

## 5. How each required plan point is addressed

| Required point | Addressed in |
|---|---|
| How to mock `useAuth()` in Playwright E2E | Subtask 2 — `page.route()` interception of `clerk.accounts.dev` client-side token endpoint (network-level MSW-style mock), the layer where the CORS failure occurs |
| Keep or replace `setup-clerk-coach` | Keep it for server-side auth (`__session` cookie → middleware + server `auth()`). Add the client-side `useAuth()` mock on top. Do NOT replace; server-side still needs the real Clerk Backend API session. |
| Verify claim fires | Route interception of `**/api/checkout/*/claim`; assert `claimRequested === true` and `authenticated === true` (Cookie header present) |
| Verify redirect to `/onboarding/coach` | `await expect(page).toHaveURL(/\/onboarding\/coach/)` after claim response |
| Unit tests for the mock | None required — the mock is test infrastructure verified through the E2E test itself (Subtask 5). No Vitest unit tests for the Playwright route mock. |
| Do NOT modify production code | Explicit boundary in every subtask; only `tests/` and `playwright.config.ts` may change |

---

## 6. Risks and do-not-touch boundaries

### Risks
- **Hydration mismatch:** `CheckoutClaim` starts with `status: 'checking'` and only transitions in a `useEffect`, so there is no SSR/client mismatch for the claim state. Safe.
- **Mock response shape:** The mocked Clerk response must match what `@clerk/nextjs` v6 `useAuth()` expects (`isSignedIn`, `isLoaded`, `user`, `session`). If the shape is wrong, `useAuth()` may stay in loading state and the claim won't fire. Mitigated by Subtask 1 survey.
- **`setup-clerk-coach` cookie vs. mock:** The `__session` cookie (server-side) and the client-side mock are independent; both must be present for the full flow (middleware sees signed-in coach via cookie; client `useAuth()` sees signed-in via mock).
- **Clerk version drift:** If Clerk v6 changes its frontend API endpoints, the route-interception patterns in the mock may need updating.

### Do-not-touch boundaries (hard)
- `apps/web/src/app/payment/success/page.tsx` — production code, DO NOT MODIFY.
- `apps/api/` — no backend/contract changes.
- `apps/mobile/` — no mobile changes.
- `apps/rules/` — no rule changes.
- The two unauthenticated tests in `auto-claim.spec.ts` — leave them using fresh contexts without the mock.

---

## 7. Conventional commit (for implementation PR)

`test(web): mock Clerk useAuth() for auto-claim E2E test`

Body: intercept clerk.accounts.dev client-side token endpoint so useAuth() returns isSignedIn: true; CheckoutClaim's claim effect fires and redirects to /onboarding/coach. Keeps setup-clerk-coach for server-side auth. No production code changes.