# T-009 — Design Review: Auth + Checkout Entry UX

**Reviewer:** UX/UI Designer (stage 1 gate)  
**Spec:** `docs/superpowers/specs/2026-11-16-auth-checkout-entry-ux-design.md`  
**Rules consulted:** `01-brand-guidelines.md`, `02-design-system.md`, `03-ux-workflows.md`, `MASTER_PROMPT.md`  
**Status:** REVIEWED — approved to proceed to dev-front (stage 2), with gaps flagged below.

---

## (a) Component reuse — confirmed

The plan introduces **zero new visual patterns** and **zero new components**. Every affected screen reuses existing components only:

| Screen | Reused components | New components |
|---|---|---|
| Landing `(marketing)/page.tsx` | None yet (marketing sections) — CTA is inline | None |
| `/sign-up` | `AuthShell`, `SignUpForm` (via `Suspense`) | None |
| `/sign-in` | `AuthShell`, `SignInForm` | None |
| `/payment/interstitial` | `AuthShell`, `PlanSummaryCard`, `ErrorState`, `useSelectedPlan`, `Loader2` spinner | None |
| `/payment/success` | `AuthShell`, `PlanSummaryCard`, `ErrorState`, `SignUpForm`, `useSelectedPlan`, `Loader2` spinner | None |

`CodeInput` exists in `features/auth/components/` but is not directly referenced by these five page files (it is consumed internally by the forms). That is consistent with the spec — no new components, no new routes.

**Tokens:** all screens use `bg-brand-primary`, `text-brand-primary`, `border-brand-primary`, `text-text-primary`, `text-text-secondary`, `bg-surface-*`, `border-surface-6`. Dark-first, single Blue accent. No second hue introduced.

---

## (b) Per-screen states / copy the dev-front must implement

One line per screen → state → copy/component.

### 1. Landing — `apps/web/src/app/(marketing)/page.tsx`

- **Not signed-in (default):** CTA → `/sign-up?plan=<plan>` — component: primary Button `bg-brand-primary`, copy "Empezar gratis" (nav + hero + contacto). One primary action only.
- **Signed-in + coach activated+paid:** CTA → `/coach/plan` — same Button component, copy must change destination only (keep "Empezar gratis" tone or role-appropriate; do not add a second CTA).
- **Signed-in + pago pendiente:** CTA → `/payment/interstitial?plan=<plan>` — same Button component.
- **Signed-in + sin rol (atleta):** stay on landing pública, no redirect to `/sign-in`/`/coach`.
- **Session-check loading (ALL signed-in cases):** spinner/skeleton contextual during Clerk session resolution — never an empty screen, never flash the signed-out CTA then redirect. Use `Loader2` `animate-spin` `text-brand-primary` (matches sign-in page pattern).
- **Copy tone:** Spanish, Rioplatense-neutral — "Empezar gratis", "Más información", "¿Listo para empezar?", "Únete a cientos de coaches que ya usan MR Training". Keep verb-first, no exclamation points, no "journey"/"unleash"/emoji (01-brand §8).

**Gap to fix:** the landing currently has **no session read at all** and hard-links both nav and hero CTAs to `/sign-up?plan=plan-seed-starter`. Add Clerk session check + conditional CTA + loading state before any redirect renders.

**Mobile flag:** nav CTA uses `px-4 py-2` (≈32px tall) — below the 44pt touch-target minimum (02-design §3.1, 03-ux §8). Raise to `h-12`/`py-3` min on mobile.

---

### 2. Sign-up — `apps/web/src/app/(auth)/sign-up/page.tsx`

- **Not signed-in:** render current `SignUpForm` inside `AuthShell` (title "Crea tu cuenta", subtitle "Únete a MR Training hoy") — unchanged.
- **Signed-in + coach activated+paid:** redirect → `/coach/plan`.
- **Signed-in + pago pendiente:** redirect → `/payment/interstitial?plan=<plan>`.
- **Signed-in + sin rol:** redirect → `/` (landing pública).
- **Session-check loading (all redirect cases):** spinner `Loader2` `animate-spin` `text-brand-primary`, centered — mirror sign-in page's `isLoaded && isSignedIn` spinner. Never render the form while the guard resolves, never empty screen.
- **Primary action:** `SignUpForm`'s own CTA (inside the form); the guard redirect is automatic, not a competing CTA.
- **Copy:** `AuthShell` title/subtitle already Spanish ✓.

**Gap to fix:** **no session guard exists today** — the page always renders `SignUpForm`. Add the guard per spec §9 #1 before dev-front touches anything else.

---

### 3. Sign-in — `apps/web/src/app/(auth)/sign-in/page.tsx`

- **Not signed-in:** render `SignInForm` inside `AuthShell` (title/subtitle via `useI18n('common')` → Spanish ✓).
- **Signed-in:** redirect to home by role (`/coach/plan`, `/admin/dashboard`, `/`) — already implemented ✓.
- **Loading during redirect:** spinner `Loader2` `animate-spin` — already implemented ✓.
- **`destinationFor()` must read `plan`:** if `searchParams.get('plan')` present and no `redirect_url`, destination = `/payment/interstitial?plan=<plan>` (resume checkout). `redirect_url` still wins when present.
- **Primary action:** `SignInForm` CTA — one per screen ✓.
- **Copy:** Spanish via i18n ✓.

**Gap to fix (confirmed by spec):** `destinationFor()` currently handles `redirect_url` and `role` but **NOT `plan`**. The plan context from sign-up → sign-in (`form_identifier_exists` redirect) is lost. SignUpForm already sends `&plan=` (verified in `SignUpForm.tsx:142`), so sign-in only needs to read it. Add `plan` to `destinationFor`.

---

### 4. Payment interstitial — `apps/web/src/app/payment/interstitial/page.tsx`

- **No session:** current flow — activate via `/api/coach/activate`, then show "Pagar y activar plan". Keep.
- **Session active + pago pendiente:** show "Pagar y activar plan" (current flow) — keep.
- **Session active + suscripción confirmada:** **skip directly to** `/onboarding/coach?plan=<plan>` — **NOT implemented today**. The page always calls `/api/coach/activate` and shows the pay button.
- **Loading (`activating`):** `Loader2` spinner + "Activando tu cuenta de coach..." ✓.
- **Error:** `ErrorState message={error} onRetry={handleRetryActivation}` — human message + retry ✓ (never stack trace).
- **Primary action:** "Pagar y activar plan" — one per screen ✓. Secondary "Volver al inicio" → `/sign-in?plan=...` (ghost, lower priority) ✓.
- **Copy:** Spanish ✓ ("Confirma tu pago", "Tu cuenta ya está creada", "Pagar y activar plan", "Volver al inicio").

**Gap to fix:** add session/subscription-aware skip logic per spec §9 #4. When already signed-in and paid, never show the pay button — jump to onboarding.

---

### 5. Payment success — `apps/web/src/app/payment/success/page.tsx`

- **Hybrid checkout (`?checkout=`), not signed-in:** show `SignUpForm` (`CheckoutClaim` "needs-account"), then claim on success → `/onboarding/coach?plan=<plan>`. Keep — no duplicated registration.
- **Hybrid checkout, already signed-in:** claim **directly**, do **not** render `SignUpForm`. Currently `claim()` runs directly when `isSignedIn` ✓ — but verify the `needs-account` branch is unreachable when signed in (it is, by the `isSignedIn` check).
- **Subscription success (`?plan=`), approved:** check icon + "Pago recibido. Plan X activado." + `PlanSummaryCard plan={plan} paid` + "Completar perfil" → `/onboarding/coach?plan=`. ✓
- **Pending:** "Tu pago se está procesando..." + "Continuar al perfil". ✓
- **Failed:** "El pago no pudo confirmarse. Tu cuenta de coach sigue activa." + "Ver opciones de pago" → `/payment/failed`. ✓
- **Loading (`checking`/`claiming`):** `Loader2` spinner + "Activando tu plan..." / "Confirmando tu pago..." ✓.
- **Error:** `ErrorState message={error} onRetry` ✓.
- **Primary action:** one per screen (Completar perfil / Continuar al perfil / Ver opciones de pago) ✓.
- **Copy:** Spanish, Rioplatense-neutral — "Creá tu cuenta para activar el plan y empezar" (voseo ✓), "Pago recibido", "Completar perfil". ✓

**Gap to fix:** none structural. Only confirm the signed-in `CheckoutClaim` branch never renders `SignUpForm` (code review to verify).

---

## (c) UX criteria gaps (spec §3) the dev-front must respect

| Criterion | Status | What dev-front must ensure |
|---|---|---|
| **Loading:** skeleton/spinner contextual, never empty | GAP | Landing + sign-up have no session-check loading state. Add `Loader2` spinner during Clerk session resolution so users never see an empty screen or a flash of the wrong CTA before redirect. |
| **Empty:** illustration + copy + acción sugerida | N/A–partial | These are auth/payment screens, not data views. `ErrorState` covers error (message + retry). No empty-state illustration is needed here; do not add one (would be a new pattern). |
| **Error:** human message + retry, never stack trace | OK | `ErrorState` used in interstitial + success. Landing's `fetchPlans`/`fetchTestimonials` silently swallow errors (pre-existing, out of T-009 scope). |
| **Primary action:** one per screen | OK | All five screens have a single primary CTA. Keep nav+hero landing CTAs as the same action (same destination), not two competing actions. |
| **Mobile:** 60 FPS, touch targets ≥44pt, safe areas | GAP | Landing CTA `py-2` is <44pt. Buttons in interstitial/success are `h-12` (48px) ✓. Ensure mobile safe-area insets on payment screens and no layout shift during spinner→content swaps. |

---

## Transition between the two flows (checkout vs normal sign-in) — conflicts to avoid

The spec's core risk is users seeing conflicting CTAs across the checkout and normal sign-in flows. dev-front must guarantee:

1. **Landing CTA never sends a signed-in user to `/sign-up`.** Signed-in + paid → `/coach/plan`; signed-in + pending → `/payment/interstitial?plan=X`; signed-in + no role → stay on landing. Only signed-out users reach `/sign-up?plan=X`.
2. **`sign-in` `destinationFor()` preserves `plan`.** When a user lands on `/sign-in?email=...&plan=...` (from `SignUpForm`'s `form_identifier_exists` redirect), post-sign-in must resume `/payment/interstitial?plan=<plan>`, not drop the plan and send them to `/coach/plan`.
3. **Interstitial skips to onboarding when session + paid.** A signed-in, already-paid coach must never see "Pagar y activar plan" — that is a conflicting CTA.
4. **No screen shows two primary CTAs.** Landing nav + hero both say "Empezar gratis" but point to the same destination — acceptable, but after the conditional change they must resolve to a single destination per session state, never two different destinations on one screen.

---

## Decision

**APPROVED to proceed to dev-front (stage 2).** No new components, no new routes, no new tokens. The five gaps above (landing session guard + conditional CTA + loading, sign-up session guard, sign-in `plan` in `destinationFor`, interstitial session-aware skip, mobile touch targets) are implementation requirements, not design changes. dev-front should address them in spec order (subtasks 1–5).
