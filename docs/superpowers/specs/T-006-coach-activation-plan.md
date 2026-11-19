# T-006 — Coach Activation Flow Implementation Plan

**Status:** Plan (no code changes yet)  
**Role:** Architect (dispatched worker)  
**Branch:** `dev` (shared checkout — no branches, no worktrees, do not run `scripts/worktree.sh`)  
**Source of truth:** `apps/api` Go API (Fiber). Web consumes it; thin Next.js proxies only for Clerk/webhook and checkout bridging.  
**Design spec:** `docs/designs/T-006-coach-activation-flow.md` (UX/UI — not re-designed here)  
**Rules read:** `MASTER_PROMPT.md`, `05-backend-architecture.md`, `06-frontend-architecture.md`, `08-api-specification.md`, `04-database-design.md`, `11-security.md`, `13-testing.md`, `12-coding-standards.md`, `03-ux-workflows.md`

---

## 0. Context summary (verified root causes)

The coach activation flow is broken end to end. The ten diagnosed root causes (taken as verified; not re-derived here) are:

1. Clerk webhook `POST /webhooks/clerk` not effectively provisioning `users` + `coaches` rows + `coach_code`; the Next.js proxy swallows the 404 and returns 200, so Clerk never retries.
2. Clerk v6 `signUp.create()` does not accept `publicMetadata`; `SignUpForm.tsx` passes `publicMetadata: { role }` behind `as unknown as never`, so the role is silently dropped. Verified: last registered user has `public_metadata: {}`.
3. `clerk_client.go` `UpdateMetadata` used the invalid payload key `metadata` (fixed in `ff51de8` → `UpdatePublicMetadata` / `UpdateUnsafeMetadata` / `MergePublicMetadata`).
4. `CoachOnboarding` fetches `/api/public/plans` (404); the working route is `/api/marketing/plans` (proxies Go `GET /public/plans`) → empty plan grid.
5. `CoachOnboarding` collects sports/specializations/experience/team/certifications then discards them; `onComplete` forwards only `planId`, and the onboarding page only uses `data.planId`. Nothing is persisted.
6. `APP_URL=http://localhost:9090` (API URL) is used to build Wompi `success_url` → `localhost:9090/payment/success` (404; the route belongs to the web app).
7. `WOMPI_WEBHOOK_URL` points at the web app root instead of the Go API `/webhooks/wompi`.
8. Onboarding sends the coach to `/welcome-dashboard` (not the coach area); middleware routes users whose `publicMetadata.role` is missing to `/`.
9. `POST /api/v1/coach/onboard` (`AdminHandler.OnboardCoach`) exists but is never called by the web, takes `clerk_id` from the REQUEST BODY (IDOR), and does not create the `users` row.
10. `/sign-in` shows "Ya tienes una sesión activa." as an error for an already-signed-in user.

---

## 1. Decomposition — ordered slices (~100 changed lines each)

Each slice is independently reviewable and leaves the tree green:
`go build ./... && go test ./...` (api) and `pnpm lint && pnpm test && pnpm build` (web).

| # | Role | Files touched | What changes | Commit message |
|---|------|---------------|--------------|----------------|
| 1 | dev-backend | `apps/api/cmd/api/routes_setup.go` (ensure call), `apps/api/internal/interfaces/http/handlers/clerk_webhook.go` | Mount `POST /webhooks/clerk` (verify `RegisterClerkWebhookRoutes` is invoked). Handler: on `user.created`/`user.updated`, idempotently create `users` row (`ON CONFLICT`), create `coaches` row when role=coach, generate `coachCode`, write `role` + `coachCode` to Clerk PUBLIC metadata via `clerkClient.UpdatePublicMetadata`. | `fix(api): mount clerk webhook; provision users+coaches rows and write role to Clerk public metadata` |
| 2 | dev-backend | `apps/api/migrations/postgres/421_coach_onboarding_profile.up.sql` + `.down.sql` | Additive schema change to `coaches`: `sports TEXT[] NOT NULL DEFAULT '{}'`, `team_name VARCHAR(200)`, `team_size INTEGER`, `age_group VARCHAR(50)`, `experience_level VARCHAR(30)`, `certifications JSONB NOT NULL DEFAULT '[]'`. Idempotent (`ADD COLUMN IF NOT EXISTS`), up/down pair. No data loss. | `feat(api): add coach onboarding profile columns to coaches table` |
| 3 | dev-backend | New: `apps/api/internal/interfaces/http/handlers/coach_activation.go` (+ route registration in `routes.go`, wiring in `routes_setup.go`) | `POST /api/v1/coach/activate` (auth group, RequireAuth — any signed-in user self-activates). Validates Clerk bearer token, creates/ensures `users` row, creates `coaches` row, writes `role: coach` + `coachCode` to Clerk PUBLIC metadata. Body: `{ plan_id }`. Response: `{ coach_id, coach_code, role }`. Server-authoritative: client never writes Clerk metadata. | `feat(api): POST /api/v1/coach/activate server-authoritative coach activation` |
| 4 | dev-backend | `apps/api/internal/interfaces/http/handlers/admin.go` (`OnboardCoach`) | Fix `POST /api/v1/coach/onboard`: take `clerk_id` from the authenticated Clerk context (NOT the request body — closes IDOR), create `users` row if missing, upsert coach profile fields (`sports`, `team_name`, `team_size`, `age_group`, `experience_level`, `specializations`, `certifications`, `bio`). RequireCoach. Response: `{ coach_id }`. | `fix(api): POST /api/v1/coach/onboard server-authoritative profile persistence (no IDOR)` |
| 5 | dev-backend | New checkout/status handler + `routes.go`/`routes_setup.go` wiring; `apps/api/.env` | `POST /api/v1/payments/checkout` (auth, RequireCoach) → creates Wompi checkout, returns `{ checkout_url, reference }`. `GET /api/v1/payments/:reference/status` (auth, RequireCoach) → `{ status, reference }` reflecting Wompi webhook state. Add `WEB_APP_URL` env; Wompi back_urls (success/failed/pending) use `WEB_APP_URL`, not `APP_URL`. Fix `WOMPI_WEBHOOK_URL` → Go API `/webhooks/wompi`. | `feat(api): coach checkout + payment status endpoints; split APP_URL/WEB_APP_URL; fix Wompi webhook URL` |
| 6 | dev-front | `apps/web/src/app/(auth)/sign-up/page.tsx`, `apps/web/src/features/auth/components/SignUpForm.tsx` | Plan-context banner on all 3 steps ("Te estás registrando para {planName} — ${price}/mes"). Remove `publicMetadata: { role }` (forged, dropped by Clerk v6); keep only `unsafeMetadata.plan`. Exit on success → `/payment/interstitial?plan=<id>` (was `/onboarding/coach`). Copy → Spanish per spec (§6). | `feat(web): sign-up plan banner + exit to payment interstitial` |
| 7 | dev-front | NEW: `apps/web/src/app/(payment)/interstitial/page.tsx`, `success/page.tsx`, `failed/page.tsx`, `pending/page.tsx` | Four new pages per design spec §3.3–3.6: interstitial (plan card + "Pagar y activar plan" CTA → Wompi checkout; redirect-failure branch with "Reintentar redirección"), success ("Pago confirmado" + "Completar perfil" → onboarding; loading while confirming webhook), failed ("Pago no completado" + retry / enter-without-pay, not a trap), pending (auto-polls → success/failed). | `feat(web): payment interstitial + success/failed/pending pages` |
| 8 | dev-front | `apps/web/src/app/(auth)/onboarding/coach/page.tsx`, `apps/web/src/features/auth/components/CoachOnboarding.tsx` | Step 0 = read-only "your plan" summary card (plan already paid, not editable). Steps 1–4 unchanged, Spanish copy. NEW final review step listing every answer + single "Guardar perfil" CTA → persists to Go API `POST /api/v1/coach/onboard` → `/coach/plan`. Fix plan fetch to use the working plans route (`/api/marketing/plans` proxy → Go `GET /public/plans`). Remove skip (mandatory after payment). | `feat(web): coach onboarding read-only plan step + review step + profile persistence` |
| 9 | dev-front | `apps/web/src/app/(auth)/sign-in/page.tsx`, `apps/web/src/middleware.ts` | `/sign-in` while signed in → silent role-based redirect (coach → `/coach/plan` or `/onboarding/coach?plan=` if plan param and not on-boarded; super-admin → `/admin/dashboard`; otherwise `/`). No "Ya tienes una sesión activa." error, no loading spinner. Unknown role → friendly notice + "Continuar como {name}" CTA. Middleware keeps routing missing-role users to `/` (already largely in place). | `fix(web): sign-in session-conflict redirect by role` |
| 10 | dev-front+backend (env) | `apps/api/.env`, `apps/web/.env` (or `.env.example`) | Split `APP_URL` (API base, server-to-server, stays `http://localhost:9090`) from new `WEB_APP_URL` / `NEXT_PUBLIC_WEB_APP_URL` (web base, `http://localhost:3000`). Wompi back_urls use `WEB_APP_URL`. Fallback: `WEB_APP_URL` defaults to `http://localhost:3000` when unset (dev); required in prod. | `chore(api,web): split APP_URL/WEB_APP_URL; fix Wompi webhook URL` |

Slice order ensures each leaves the tree green: backend foundation (1–5) before frontend (6–10), with env split (10) usable by either side. Backend slices 1–5 are `dev-backend`; frontend slices 6–9 are `dev-front`; slice 10 is shared env (both). The two roles can work in parallel once slice 1's contract (activation endpoint + metadata write) is agreed, but slice 4's `OnboardCoach` fix depends on slice 2's schema, and slice 8 depends on slice 4's endpoint.

---

## 2. Team & role assignment

| Role | Slices | Timing |
|------|--------|--------|
| `dev-backend` | 1, 2, 3, 4, 5 | Backend foundation. Slice 1 → 2 → 3 → 4 → 5 sequentially (schema before onboard fix; checkout after activation). |
| `dev-front` | 6, 7, 8, 9 | Frontend. Slice 6 → 7 → 8 → 9 sequentially (onboarding persistence depends on backend slice 4's endpoint). |
| `dev-backend` + `dev-front` (shared) | 10 | Env split; can be done in parallel with any slice but must land before payment pages (7) are end-to-end testable. |

Given the flow spans Go + Next.js, slices 1–5 are `dev-backend`, slices 6–9 are `dev-front`, slice 10 is shared. No subagents/helpers are needed for this plan task.

---

## 3. Contract decisions

### Decision 1 — How the web tells the Go API "this is a coach sign-up" (client cannot forge)

**Chosen:** server-side activation endpoint `POST /api/v1/coach/activate` called with the Clerk bearer token. Go (which alone holds the Clerk secret key) validates the token, identifies the user, creates the `users` + `coaches` rows, generates `coachCode`, and writes `role: coach` + `coachCode` to Clerk PUBLIC metadata.

**Options weighed:**

| Option | Verdict | Why |
|--------|---------|-----|
| A. Server-side activation endpoint + Clerk bearer token | **CHOSEN** | Go is the only holder of the Clerk secret key, so only Go can authoritatively write Clerk public metadata. The bearer token proves identity (Clerk JWT validated server-side). Client never writes metadata, never sees the secret → cannot self-assign `role: coach`. Matches security rule "role written to Clerk must be server-authoritative" (11-security §2–3). |
| B. Signed activation intent created before sign-up | Rejected | Adds complexity (intent generation, signing, verification, expiry) for no security gain over (A); the bearer token already authenticates the user at activation time. |
| C. Clerk public metadata written server-side after sign-up | Subsumed by (A) | (C) is a mechanism, not a flow; (A) is the endpoint that performs (C) after validating the bearer token. |

The Clerk webhook (slice 1) provides idempotent base provisioning (`users` + `coaches` rows on `user.created`); the activation endpoint (slice 3) confirms coach intent + `plan_id` and writes the authoritative `role: coach` metadata. Both are idempotent and safe to run for the same user.

### Decision 2 — Exact Go API endpoints needed (request/response shapes + mount location)

| Endpoint | Method | Group | Auth | Request | Response | Purpose |
|----------|--------|-------|------|---------|----------|---------|
| `/api/v1/coach/activate` | POST | `/api/v1` (auth) | RequireAuth (any signed-in user self-activates) | `{ plan_id }` | `{ coach_id, coach_code, role }` | Creates `users` + `coaches` rows; writes Clerk PUBLIC metadata `role: coach` + `coachCode`. Called after Clerk sign-up, before interstitial. |
| `/api/v1/coach/onboard` | POST | `/api/v1` (auth) | RequireCoach | `{ sports[], team_name, team_size, age_group, experience_level, specializations[], certifications[] }` | `{ coach_id }` | Upserts coach profile. `clerk_id` from authenticated context (no body-supplied ID → closes IDOR). Creates `users` row if missing. |
| `/api/v1/payments/checkout` | POST | `/api/v1` (auth) | RequireCoach | `{ plan_id, idempotency_key? }` | `{ checkout_url, reference }` | Creates Wompi checkout. Idempotency key protects against duplicate charges (08-api-spec §3.7). |
| `/api/v1/payments/:reference/status` | GET | `/api/v1` (auth) | RequireCoach | (path param `reference`) | `{ status: pending|approved|declined, reference }` | Reflects Wompi webhook-updated state. Used by `/payment/success|failed|pending` to confirm async payment. |
| `/webhooks/wompi` | POST | public (outside auth) | none (signature-verified) | Wompi webhook body | 200 | Updates payment record; source of truth for status. Mounted via `RegisterWompiWebhookRoutes`. |
| `/api/v1/public/plans` | GET | public | none | — | plan list | Already exists (`RegisterPublicPlanRoutes`). Web fetches it via the marketing proxy. |

All authenticated endpoints live in the `/api/v1` auth group (`RequireAuth`/`RequireCoach` middleware). Clerk webhook and Wompi webhook are public (outside auth) and validate their own signatures — matching the existing pattern for `RegisterWebhookRoutes`/`RegisterMercadoPagoWebhookRoutes`/`RegisterWompiWebhookRoutes` in `routes.go`.

### Decision 3 — Schema changes for the onboarding profile + migration filename

The `coaches` table currently has `specializations`, `certifications`, `bio`, `experience_years` but lacks `sports`, `team_name`, `team_size`, `age_group`, `experience_level`. Per the design spec, onboarding collects sports, specializations, experience, team name/size, age group, certifications.

**Additive migration** (expand-only, backward-compatible, no data loss, no RLS change needed beyond existing `policy_coaches_write` which uses `app.current_user_id`):

Filename: `apps/api/migrations/postgres/421_coach_onboarding_profile.sql` (up) + `421_coach_onboarding_profile.down.sql`.

```sql
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS sports TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS team_name VARCHAR(200);
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS team_size INTEGER;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS age_group VARCHAR(50);
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS experience_level VARCHAR(30);
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS certifications JSONB NOT NULL DEFAULT '[]';
```

Down migration drops the five columns (reversible; no data migration required since additive). `certifications` as JSONB matches the existing pattern (rules `04-database-design.md` §1.9 permits JSONB for variable metadata) and avoids a separate join table for the MVP. Placeholders `$1`, `NOW()`, `BOOLEAN`, `ON CONFLICT`, `gen_random_uuid()` conventions observed where applicable. `current_setting('app.current_user_id')` RLS (407) already lets a coach write their own row; new columns don't weaken that.

### Decision 4 — How the payment success page confirms payment (Wompi webhook is async)

**Do not trust the redirect.** A user can manually navigate to `/payment/success`. The flow:
- Interstitial → Go API creates checkout (`POST /api/v1/payments/checkout`) → returns `checkout_url` + `reference` → web redirects user to Wompi.
- Wompi posts webhook to `POST /webhooks/wompi` (Go API) → updates payment record status to `approved`/`declined`.
- `/payment/pending?plan=<id>` auto-polls `GET /api/v1/payments/:reference/status` until terminal; on `approved` → `/payment/success`, on `declined` → `/payment/failed`.
- `/payment/success?plan=<id>` shows loading while confirming via the status endpoint, then renders "Pago confirmado" + "Completar perfil" CTA; if not confirmed after bounded retries, falls back to `/payment/failed`.
- `/payment/failed?plan=<id>` is not a trap: "Reintentar pago" → interstitial; "Entrar sin pagar" → `/sign-in?plan=<id>` (account exists, can pay later).

This matches the design spec §5 ("Loading state: while confirming webhook, show spinner") and 08-api-spec status-code discipline (200 on confirmed, the client reads status rather than inferring success from the redirect).

### Decision 5 — `APP_URL` vs web-app URL env var + fallback

**Split:**
- `APP_URL` = Go API base (server-to-server only). Stays `http://localhost:9090`. NOT used for Wompi back_urls.
- New `WEB_APP_URL` (api side) / `NEXT_PUBLIC_WEB_APP_URL` (web side) = web app base, default `http://localhost:3000` in dev; required in prod.

**Wompi back_urls** (success/failed/pending) are built from `WEB_APP_URL` → `http://localhost:3000/payment/success|failed|pending`, fixing root cause #6 (was `localhost:9090/payment/success` → 404).

**`WOMPI_WEBHOOK_URL`** fixed to point at the Go API `/webhooks/wompi` (root cause #7), not the web app root.

**Fallback:** if `WEB_APP_URL` is unset, default to `http://localhost:3000` and log a warning; in production it must be set explicitly (no silent fallback to the API URL). `APP_URL` remains the API base and is never a fallback for web return URLs.

---

## 4. Acceptance criteria (observable, testable against a running app)

Each is one user-visible behavior a QA agent can verify:

1. **Sign-up exit:** Signing up at `/sign-up?plan=<id>` (email → code → password) lands on `/payment/interstitial?plan=<id>`, and the sign-up banner shows "Te estás registrando para {planName} — ${price}/mes" on all three steps.
2. **Provisioning:** After sign-up, the Clerk user has a `users` row and a `coaches` row with a `coach_code`, and `public_metadata.role = coach` (verified via Clerk Backend API / session claims).
3. **No forged role:** A client request to `POST /api/v1/coach/activate` without a valid Clerk bearer token returns 401; the browser cannot set `publicMetadata.role` via `signUp.create()` (verified: role only appears after server activation).
4. **Interstitial → Wompi:** Clicking "Pagar y activar plan" redirects to Wompi checkout whose `success_url`/`failed_url`/`pending_url` are under `http://localhost:3000/payment/...` (not `localhost:9090`).
5. **Pending auto-resolution:** `/payment/pending?plan=<id>` auto-resolves to `/payment/success` or `/payment/failed` based on Wompi webhook status (not the redirect alone).
6. **Success page:** `/payment/success?plan=<id>` shows "Pago confirmado" / "Tu plan está activo" and a single "Completar perfil" CTA → `/onboarding/coach?plan=<id>`.
7. **Failed page not a trap:** `/payment/failed?plan=<id>` offers "Reintentar pago" → interstitial and "Entrar sin pagar" → `/sign-in?plan=<id>`; the account exists and can sign in.
8. **Onboarding persistence:** Onboarding step 0 is a read-only paid-plan card; the final review step lists all answers (sports, team, certifications, …) and one "Guardar perfil" CTA persists to `POST /api/v1/coach/onboard` then redirects to `/coach/plan`.
9. **Final destination:** After onboarding the coach lands on `/coach/plan` (never `/welcome-dashboard`, never public landing).
10. **Sign-in conflict:** A signed-in coach hitting `/sign-in` is silently redirected to `/coach/plan` (no "Ya tienes una sesión activa." error, no spinner); super-admin → `/admin/dashboard`; unknown role → friendly notice + "Continuar como {name}".
11. **Plan context carried:** The `plan` query param is the single canonical carrier through `/sign-up`, payment pages, and `/onboarding/coach`; `planType` is no longer sent.
12. **Wompi webhook reachable:** `POST /webhooks/wompi` on the Go API returns 200 on a valid signature (not a swallowed 404→200 via the Next proxy).

---

## 5. Risks & do-not-touch boundaries

- **Do not touch the ~130 uncommitted WIP files** on `dev`; only T-006 files. No branches/worktrees.
- **`coaches` table (RLS):** Migration 421 is additive (expand-only) so no existing data is lost. Existing RLS policies (407) gate writes on `app.current_user_id` = coach `id`; new columns don't change that, but QA must confirm a coach can still `INSERT`/`UPDATE` their own row after the migration. Never edit an applied migration; add a new numbered file if further changes are needed.
- **Clerk webhook idempotency:** `user.created` may fire before or after the activation endpoint; both must be idempotent (`ON CONFLICT` on `users`/`coaches`, `ON CONFLICT` on `coach_code` unique index).
- **Wompi sandbox:** webhooks may not fire reliably in sandbox; the status endpoint must handle `pending` gracefully and not fail closed.
- **Chicken-and-egg on role:** middleware reads `publicMetadata.role` (set by activation/webhook). A user who signed up before activation lands may briefly resolve as "athlete" → routed to `/`. Activation must run before the interstitial so the role is set when the coach returns.
- **IDOR fix (slice 4):** `clerk_id` must come from the authenticated Clerk context, never the request body; callers must be audited to not pass a foreign `clerk_id`.
- **No new dependencies:** Go — no new third-party packages; Web — no new npm packages.
- **`APP_URL` misuse:** any code still building Wompi back_urls from `APP_URL` must be switched to `WEB_APP_URL`; grep for `APP_URL` in payment/webhook URL construction.
- **Existing endpoint already present:** `POST /api/v1/coach/onboard` (`RegisterCoachOnboardingRoutes`) and `POST /coach/subscription/checkout` (`RegisterCoachPlatformSubscriptionRoutes`) exist; slices fix/repoint them rather than duplicating.
- **Do not re-design:** follow the design spec copy/tokens/steps exactly; do not add screens or change the step order.

---

## 6. Definition of done (for this plan task)

- `docs/superpowers/specs/T-006-coach-activation-plan.md` exists with: ordered slices (files + commit message each), role assignment, the five contract decisions with justification, testable acceptance criteria, risks.
- No code changes.
- Outcome: succeeded.
