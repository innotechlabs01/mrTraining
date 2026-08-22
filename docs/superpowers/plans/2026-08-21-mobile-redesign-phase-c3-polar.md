# Mobile Redesign — Phase C3 Payments: Migrate Paddle → Polar.sh

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the (incomplete, never-wired) Paddle stack with a real Polar.sh integration and remove all Paddle references. Add `@polar-sh/sdk`, add `polar_*` DB columns, replace `/api/paddle/*` with `/api/polar/*` (hosted checkout + signed webhook), re-point the membership DB helpers to `polar_*`, and wire the mobile `PaymentScreen`/`MembershipScreen` to open the Polar checkout URL and refresh on return. Delete all Paddle env vars, routes, columns, and strings.

**Architecture:** Polar uses one SDK (`@polar-sh/sdk`): `new Polar({ accessToken })` then `polar.checkouts.create({...})` returns a hosted checkout URL we open in the system browser; a signed webhook is verified with `validateEvent(body, headers, secret)` (Polar sends `webhook-id`/`webhook-timestamp`/`webhook-signature` headers). Order/subscription events (`order.paid`, `subscription.canceled`) drive membership state. `membershipId`/`athleteId`/`coachId` travel as checkout `metadata` so the webhook routes back to the right record. `recordPayment` / `cancelMembership` re-point to `polar_*` columns; `paddle_*` columns are dropped.

**Tech Stack:** `@polar-sh/sdk` (Node/Next.js SDK), Next.js API routes, `@libsql/client`, LibSQL/Turso, Expo SDK 54 mobile.

**Source spec:** `docs/superpowers/specs/2026-08-21-mobile-redesign-design.md` §5.3 — adjusted per user: use Polar, remove Paddle entirely.

**Key decisions:**
1. Drop Paddle entirely (user request): remove `/api/paddle/*`, `paddle_*` env vars, `paddle_*` columns, Paddle strings in mobile. Add `polar_subscription_id`/`polar_product_id` to `athlete_memberships` and `polar_order_id`/`polar_invoice_url` to `membership_payments`.
2. Webhook verifies signatures with the SDK `validateEvent` (no manual HMAC).
3. Checkout carries `metadata: { membershipId, athleteId, coachId }`; `productId` resolved from `membership.polarProductId` else an env `POLAR_DEFAULT_PRODUCT_ID`.
4. Mobile opens the returned `url` via `Linking.openURL`; on focus it invalidates the membership query. Hosted checkout in the system browser (no native SDK).

**Ground truth (verified):** No Paddle SDK installed; `/api/paddle/checkout` returns a fake object (paddlePriceId always null); `/api/paddle/webhook` does `req.json()` with NO signature verification; env vars mostly unused; no plan→priceId config. `recordPayment` (coaching-db.ts ~1083) inserts `membership_payments` + renews; `cancelMembership` (~1053) sets status cancelled. `membershipRowToObj`/`getPaymentHistory` read `paddle_*`. Mobile pay buttons are pure stubs.

---

## Task 0 — Deps + env + security rules

**Files:** Modify `apps/web/package.json`, `apps/web/.env.example`, `apps/rules/11-security.md` (+ `docs/11-security.md` if present)

- [ ] `cd apps/web && npm install @polar-sh/sdk` (use --legacy-peer-deps if peer conflicts).
- [ ] In `.env.example` REMOVE all `PADDLE_*` vars; ADD:
```
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
```
(Note: the dev must add real values to `.env.local` — do not invent them.)
- [ ] In `apps/rules/11-security.md` (and docs if present) replace Paddle CSP hosts (`js.paddle.com`, `api.paddle.com`, `paddle.com`) with `polar.sh` / `api.polar.sh`.
- [ ] Commit: `feat(web): add polar-sh sdk, swap env and CSP for polar`

## Task 1 — DB migration: polar columns + drop paddle columns

**Files:** Create `apps/web/migrations/009_polar_payments.sql`

- [ ] Create the file:
```sql
-- Phase C3: migrate membership/payment tracking from Paddle to Polar.
ALTER TABLE athlete_memberships RENAME COLUMN paddle_subscription_id TO polar_subscription_id;
ALTER TABLE athlete_memberships RENAME COLUMN paddle_price_id TO polar_product_id;
ALTER TABLE membership_payments RENAME COLUMN paddle_transaction_id TO polar_order_id;
ALTER TABLE membership_payments RENAME COLUMN paddle_invoice_url TO polar_invoice_url;
```
(SQLite may error renaming a column absent on some DBs. If an ALTER fails, report it and prefer a guarded/ADD-column approach; do not silently lose data. Manual apply.)
- [ ] Commit: `feat(web): migrate payment columns to polar identifiers`

## Task 2 — coaching-db.ts: re-point helpers to polar columns

**Files:** Modify `apps/web/src/lib/coaching-db.ts`

- [ ] Update `membershipRowToObj` + row readers: `paddleSubscriptionId`/`paddlePriceId` → `polarSubscriptionId`/`polarProductId`. Update `getPaymentHistory` to read `polar_order_id`/`polar_invoice_url`. Update `recordPayment` INSERT and `createMembership` INSERT to use `polar_*`. `cancelMembership`/`getAthleteMembership` logic unchanged except column reads.
- [ ] `grep -rn "paddle" apps/web/src/lib/coaching-db.ts` → 0.
- [ ] `cd apps/web && npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `refactor(web): repoint membership record/cancel helpers to polar columns`

## Task 3 — POST /api/polar/checkout

**Files:** Create `apps/web/src/app/api/polar/checkout/route.ts`

- [ ] Create the route (adapt to installed SDK types; use `auth()` + `getAthleteByClerkId`; `getAthleteMembership`). Read from `membership.polarProductId ?? process.env.POLAR_DEFAULT_PRODUCT_ID ?? ''`; if empty → 400 `{ error: 'product not configured' }`. Build `polar.checkouts.create({ productId, customerEmail, metadata: { membershipId, athleteId, coachId }, successUrl })`. Return `{ url, orderId }`. Wrap in try/catch → 500/400.
- [ ] `npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `feat(web): add polar hosted checkout session endpoint`

## Task 4 — POST /api/polar/webhook

**Files:** Create `apps/web/src/app/api/polar/webhook/route.ts`

- [ ] Create the route using SDK `validateEvent`. On invalid signature → 400. Handle `order.paid` → `recordPayment` (pass polar fields) and `subscription.canceled` → `cancelMembership`, both reading `event.metadata`. Wrap handler in try/catch → 500 on error. Adapt field names to the SDK typed payloads (read the types) and update `recordPayment`'s type to accept polar columns.
- [ ] `npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `feat(web): add polar signed webhook for payments and membership`

## Task 5 — Remove Paddle routes + references

**Files:** Delete `apps/web/src/app/api/paddle/`

- [ ] `rm -rf apps/web/src/app/api/paddle`
- [ ] `grep -rni "paddle" apps/web/src apps/web/.env.example apps/web/package.json` → 0 matches.
- [ ] `npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `refactor(web): remove all paddle routes and references`

## Task 6 — Mobile: open Polar checkout + remove Paddle strings

**Files:** Modify `apps/mobile/src/features/membership/presentation/screens/MembershipScreen.tsx`, `apps/mobile/src/features/membership/presentation/PaymentScreen.tsx`

- [ ] Replace the stub pay handler in both screens: call `apiClient.post('/polar/checkout', { membershipId })` (confirm the basePath → `/api/polar/checkout`; report how invoked). On success `Linking.openURL(response.url)` (import `Linking` from react-native); keep loading state; on focus invalidate `['membership']`.
- [ ] Remove all Paddle strings: `grep -rni "paddle" apps/mobile/src` → 0 after edit.
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS; `npx jest` green.
- [ ] Commit: `feat(mobile): open polar checkout and remove paddle stubs`

## Task 7 — Final verification + apply note

- [ ] `cd apps/web && npx tsc --noEmit` — EXPECT PASS.
- [ ] `cd apps/mobile && npx tsc --noEmit` + `npm test` — EXPECT PASS.
- [ ] `grep -rni "paddle" apps/web apps/mobile` — 0 matches (outside the spec doc intended to record the retirement).
- [ ] Apply migrations note: `009_polar_payments.sql` is manual-apply like 007/008.
- [ ] Commit: `chore: verify phase C3 polar migration complete`

---

## Post-conditions

- No `paddle` references remain in apps/web or apps/mobile code/env CSP (except a documented retirement note).
- `POST /api/polar/checkout` returns a hosted checkout `url`; `POST /api/polar/webhook` verifies signatures and records/cancels membership.
- Mobile pay buttons open the Polar checkout in the browser and refresh membership on return.
- `npx tsc --noEmit` green in both apps; mobile jest green.
