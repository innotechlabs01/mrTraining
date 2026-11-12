# T-006 — Coach Activation Flow Design Spec

**Status:** Design (no code changes)
**Owner:** UX/UI Designer
**Scope:** `apps/web` — coach activation end-to-end (marketing → sign-up → payment → onboarding → coach dashboard)

---

## 1. Summary of decisions (what differs from today)

| # | Decision | Today (defect) | New design |
|---|----------|----------------|------------|
| 1 | Plan handoff across the chain | `plan` query param carried only into sign-up; `planType` also present; plan context lost after sign-up | Single canonical carrier: `plan` query param on `/sign-up`, `/onboarding/coach`, and all payment-return pages. `planType` removed — redundant, never read. |
| 2 | Sign-up success → next screen | `/onboarding/coach?plan=<id>` immediately (before payment) | New payment interstitial page between account creation and Wompi redirect. Plan context preserved. |
| 3 | Payment return URLs | `http://localhost:9090/payment/success|failed|pending` → 404 (Go API URL, not web URL) | New Next.js pages: `(payment)/success`, `(payment)/failed`, `(payment)/pending` at `http://localhost:3000/payment/success|failed|pending` |
| 4 | Onboarding step 0 (plan re-pick) | Coach re-picks a plan inside onboarding (fetches `/api/public/plans` which 404s → empty grid) | Step 0 becomes a **read-only "your plan" summary card** showing the already-paid plan. Not removable (keeps stepper stable and confirms what was paid for). Coach cannot change it here. |
| 5 | Onboarding data persistence | All answers (sports, specializations, experience, team, certifications) collected then thrown away | New review/summary step (final step before save) lists every answer; single primary CTA "Save profile" persists to Go API; nothing is saved until confirmed. |
| 6 | Sign-in conflict (`/sign-in` while signed in) | Shows "Ya tienes una sesión activa." error | Silent redirect to role's home when session already exists and role is known (coach → `/coach/plan`, super-admin → `/admin/dashboard`, otherwise `/`). No error notice. If role unknown, show friendly notice with "continue as <name>" CTA. |
| 7 | Final destination after onboarding | `/welcome-dashboard` (then coach clicks to `/coach/plan`) | Direct to `/coach/plan` (the coach's own plan page — the coach area). `/welcome-dashboard` removed from this flow. |

---

## 2. Full user flow (entry → exit)

```
1. /planes (marketing)
   └─ User picks a plan card (Starter / Pro / Elite)
   └─ CTA "Elegir plan" → /sign-up?plan=<planId>

2. /sign-up?plan=<planId> (3-step: email → code → password)
   └─ Header badge: "Te estás registrando para Plan Pro — $59/mes" (plan context always visible)
   └─ On success → server-side provisioning (role + coachCode in Clerk metadata; users + coaches rows created)
   └─ → /payment/interstitial?plan=<planId>

3. /payment/interstitial?plan=<planId> (NEW page)
   └─ "Tu cuenta está lista. Ahora confirma el pago para activar tu plan."
   └─ Shows plan name + price, single primary CTA "Pagar y continuar"
   └─ CTA → redirect to Wompi checkout URL (hosted by Wompi)
   └─ Redirect-failure branch: Wompi unreachable / checkout URL missing → error state with retry CTA "Reintentar redirección"

4. Wompi checkout (external, hosted)
   └─ User pays → Wompi redirects back to web app

5a. /payment/success?plan=<planId> (NEW page)
   └─ "Pago recibido. Plan Pro activado."
   └─ Single primary CTA "Completar perfil" → /onboarding/coach?plan=<planId>
   └─ States: success (default), loading (while confirming with Wompi webhook)

5b. /payment/failed?plan=<planId> (NEW page)
   └─ "El pago no se pudo completar. Tu cuenta ya existe y puedes entrar sin pagar."
   └─ Primary CTA "Reintentar pago" → /payment/interstitial?plan=<planId>
   └─ Secondary CTA "Entrar sin pagar" → /sign-in?plan=<planId> (coach account exists; not trapped)
   └─ Ghost link "Ayuda" → support contact

5c. /payment/pending?plan=<planId> (NEW page)
   └─ "Estamos confirmando tu pago. No cierres esta pestaña."
   └─ Auto-polls Wompi status (or shows spinner); on success → /payment/success; on failure → /payment/failed

6. /onboarding/coach?plan=<planId> (AFTER payment confirmation)
   └─ Step 0 = read-only "your plan" summary card (plan already paid, not editable)
   └─ Steps 1–4: Sport / Experience / Team / Certifications (existing chips/forms)
   └─ NEW final review step: summary card of all answers, single primary CTA "Guardar perfil"
   └─ On save → profile persisted to Go API → /coach/plan

7. /coach/plan (final destination — coach area)
   └─ Coach's own plan page. Never /welcome-dashboard, never public landing.
```

### Entry points
- Cold start: `/planes` → plan pick → sign-up.
- Already has account, hasn't paid: sign-in → `/payment/interstitial?plan=<planId>`.
- Already paid, hasn't on-boarded: sign-in → `/onboarding/coach?plan=<planId>`.
- Fully activated: sign-in → `/coach/plan`.

---

## 3. Screen structure & component hierarchy

### 3.1 `/planes` (unchanged — reference)
`page.tsx` → `PlansSection`. Plan cards keep `href="/sign-up?plan=<id>"`. No changes.

### 3.2 `/sign-up?plan=<planId>` (modified)
`page.tsx` → `AuthShell` → `SignUpForm`.
- **New:** persistent plan-context banner inside the form (above step content): "Te estás registrando para [Plan Name] — $[price]/mes". Shows on all 3 steps.
- **New:** `planType` removed from `unsafeMetadata` (only `plan` carried).
- **Exit:** on success → `/payment/interstitial?plan=<planId>` (was `/onboarding/coach`).

### 3.3 `/payment/interstitial?plan=<planId>` (NEW page)
```
page.tsx (server component, reads searchParams.plan)
  └─ AuthShell title="Confirma tu pago" subtitle="Tu cuenta ya está creada"
       └─ PaymentInterstitial (client component)
            ├─ Plan context card: plan name + price + "Ya pagado: no" 
            ├─ Body: "Tu cuenta de coach está creada. El último paso es activar tu plan con un pago."
            ├─ Primary CTA (Blue, one per screen): "Pagar y activar plan"
            └─ Redirect-failure branch (shown only when checkout URL missing / Wompi unreachable):
                 └─ ErrorState + retry CTA "Reintentar redirección"
```
- On mount: request checkout URL from Go API (or read from provisioning result). If URL present, auto-redirect after a brief "Redirigiendo a Wompi..." moment OR require CTA press (design: single primary CTA to avoid surprise external navigation; user consciously clicks "Pagar y activar plan").
- Loading state while fetching checkout URL: skeleton/spinner inside AuthShell, CTA disabled.

### 3.4 `/payment/success?plan=<planId>` (NEW page)
```
page.tsx → AuthShell title="Pago confirmado" subtitle="Tu plan está activo"
     └─ PaymentSuccess
          ├─ Success icon (check) + headline "Pago recibido. Plan [Pro] activado."
          ├─ Body: "El siguiente paso es completar tu perfil de coach para comenzar a entrenar atletas."
          ├─ Single primary CTA: "Completar perfil" → /onboarding/coach?plan=<planId>
          └─ Ghost link: "Volver al inicio" → /
```
- Loading state: while confirming webhook, show spinner + "Confirmando tu pago..." (brief, then success or failed).

### 3.5 `/payment/failed?plan=<planId>` (NEW page)
```
page.tsx → AuthShell title="Pago no completado" subtitle="Tu cuenta de coach sigue activa"
     └─ PaymentFailed
          ├─ Alert icon + headline "El pago no se pudo completar."
          ├─ Body: "Tu cuenta de coach ya está creada. Puedes reintentar el pago o entrar sin pagar y activar tu plan más tarde."
          ├─ Primary CTA: "Reintentar pago" → /payment/interstitial?plan=<planId>
          ├─ Secondary CTA (ghost): "Entrar sin pagar" → /sign-in?plan=<planId>
          └─ Ghost link: "Ayuda" → support
```
- User is NOT trapped: account exists, can sign in and pay later.

### 3.6 `/payment/pending?plan=<planId>` (NEW page)
```
page.tsx → AuthShell title="Confirmando pago" subtitle="No cierres esta pestaña"
     └─ PaymentPending
          ├─ Spinner + "Estamos confirmando tu pago con Wompi."
          └─ Auto-resolves to /payment/success or /payment/failed
```

### 3.7 `/onboarding/coach?plan=<planId>` (modified — onboarding AFTER payment)
`page.tsx` → `AuthShell` → `CoachOnboarding`.
- `selectedPlan` passed from `plan` query param.
- Step 0 = **read-only plan summary card**: plan name, price, "Plan ya pagado — no se puede cambiar aquí". Non-editable. Auto-advance or CTA "Continuar".
- Steps 1–4 unchanged (Sport, Experience, Team, Certifications) but copy unified to Spanish (see §6).
- **NEW final review step (step 5):** summary card listing every answer collected (sports, specializations, experience, team name/size, age group, certifications). Single primary CTA "Guardar perfil". Nothing saved until confirmed.
- On save → profile to Go API → `/coach/plan`.
- Skip removed (onboarding is mandatory after payment; account exists and plan paid).
- `onComplete` → `/coach/plan` (was `/welcome-dashboard`).

### 3.8 `/coach/plan` (unchanged — final destination)
Already exists; coach lands here after onboarding. No changes.

### 3.9 `/sign-in` (modified — session conflict)
`page.tsx`: if `isLoaded && isSignedIn` → silent redirect by role (no "Ya tienes una sesión activa." error, no loading spinner):
- coach → `/coach/plan` (or `/onboarding/coach?plan=<planId>` if plan param present and not yet on-boarded)
- super_admin → `/admin/dashboard`
- otherwise → `/`
- If role unknown but signed in → friendly notice with "continue as <name>" CTA (not an error).

---

## 4. States: loading, empty, error, success

| Screen | Loading | Empty | Error | Success |
|--------|---------|-------|-------|---------|
| `/sign-up` | Clerk `isLoaded` spinner (existing) | n/a | `ErrorState` + retry | → `/payment/interstitial` |
| `/payment/interstitial` | spinner while fetching checkout URL | n/a | redirect-failure → `ErrorState` + "Reintentar redirección" | external redirect to Wompi |
| `/payment/success` | spinner while confirming webhook | n/a | → `/payment/failed` | check icon + "Completar perfil" CTA |
| `/payment/failed` | n/a | n/a | n/a (this IS the error state) | retry + enter-without-pay |
| `/payment/pending` | spinner (this IS the loading state) | n/a | → `/payment/failed` | → `/payment/success` |
| `/onboarding/coach` | plan summary skeleton | plan card empty state | `ErrorState` on save failure | → `/coach/plan` |

---

## 5. Design tokens (from existing system — no new tokens)

**Colors:**
- `--color-brand-primary` (`#15AAF2`) — single primary CTA per screen (Blue). Exactly one Blue button per screen.
- `--color-brand-primary-pressed` (`#0E93D4`) — pressed state.
- `--color-surface-0` (`#0A0B0D`) — app background.
- `--color-surface-1` (`#0F0F0F`) — primary surface.
- `--color-surface-2` (`#141416`) — elevated surface / cards.
- `--color-surface-3` (`#1A1A1C`) — card background, raised panels.
- `--color-surface-6` (`#2A2A2C`) — borders, dividers.
- `--color-text-primary` (`#F5F5F7`) — headlines, primary text.
- `--color-text-secondary` (`#9CA3AF`) — secondary text, captions.
- `--color-text-inverse` (`#111214`) — text on Blue (always Base, never white).
- `--color-success` (`#34D399`) — success states + check icon.
- `--color-error` (`#FF5A5F`) — errors + alert icon.
- `--color-warning` (`#FBBF24`) — pending state.

**Typography:**
- `--text-h2` (Montserrat 700, 28px) — page titles inside AuthShell.
- `--text-h4` (Montserrat 600, 18px) — section headers (plan name, step titles).
- `--text-body` (Inter 400, 16px) — body copy.
- `--text-body_sm` (Inter 400, 14px) — descriptions.
- `--text-caption` (Inter 500, 12px) — metadata, labels, helper text.

**Spacing:**
- `--space-4` (16px) — card padding, section gaps.
- `--space-5` (20px) — form field vertical rhythm.
- `--space-6` (24px) — page margins.
- `--gap-lg` (16px) — card grid gaps.

**Border radius:**
- `--radius-sm` (4px) — inputs, buttons, small cards.
- `--radius-md` (8px) — cards, panels.

**Components reused (no new components):**
- `AuthShell` layout, `cn()` helper, `CodeInput`, `ErrorState`, `OnboardingStepper`, plan cards, buttons (primary/secondary/ghost variants).

---

## 6. Copy (exact strings — Spanish convention)

**Language convention decision:** The app is bilingual in practice but the onboarding mixes Spanish ("Continuar", "Elige tu plan") and English ("Continue", "What sports do you coach?", "Back", "Create Account", "Verify", "Didn't receive the code?"). **Adopt Spanish as the single UI language for all screens in scope** (the product's primary user base is Spanish-speaking; existing auth copy already leans Spanish). All new/changed copy below is Spanish. No English remains in these screens.

| Context | String | Notes |
|---------|--------|-------|
| Sign-up banner (all steps) | "Te estás registrando para {planName} — ${price}/mes" | Plan context always visible |
| Sign-up step 1 CTA | "Continuar" | verb-first |
| Sign-up step 2 CTA | "Verificar" | was "Verify" |
| Sign-up step 3 CTA | "Crear cuenta" | was "Create Account" |
| Sign-up back | "Volver al inicio" | was "Back to welcome" |
| Interstitial title | "Confirma tu pago" | |
| Interstitial subtitle | "Tu cuenta ya está creada" | |
| Interstitial body | "Tu cuenta de coach está creada. El último paso es activar tu plan con un pago." | |
| Interstitial CTA | "Pagar y activar plan" | single Blue CTA |
| Interstitial retry | "Reintentar redirección" | redirect-failure branch |
| Success title | "Pago confirmado" | |
| Success subtitle | "Tu plan está activo" | |
| Success body | "El siguiente paso es completar tu perfil de coach para comenzar a entrenar atletas." | |
| Success CTA | "Completar perfil" | → onboarding |
| Failed title | "Pago no completado" | |
| Failed body | "El pago no se pudo completar. Tu cuenta de coach ya está creada. Puedes reintentar el pago o entrar sin pagar y activar tu plan más tarde." | |
| Failed CTA primary | "Reintentar pago" | → interstitial |
| Failed CTA secondary | "Entrar sin pagar" | ghost → sign-in |
| Pending title | "Confirmando pago" | |
| Pending body | "Estamos confirmando tu pago con Wompi. No cierres esta pestaña." | |
| Onboarding step 0 card | "Tu plan: {planName} — ${price}/mes (ya pagado)" | read-only summary |
| Onboarding step 0 CTA | "Continuar" | non-editable plan |
| Onboarding review title | "Revisa tu perfil antes de guardar" | |
| Onboarding review CTA | "Guardar perfil" | single Blue CTA, persists to API |
| Onboarding skip | removed | mandatory after payment |
| Sign-in conflict (known role) | silent redirect — no UI | coach → /coach/plan |
| Sign-in conflict (unknown role) | "Ya tienes una sesión activa como {name}." + CTA "Continuar como {name}" | friendly notice, not error |
| PlansSection CTA | "Elegir plan" | unchanged |

---

## 7. Accessibility notes

**Plan cards (marketing + onboarding step 0):**
- Each card is a real `<button>` (not a fake `<div>`/`<a>`), keyboard operable, `type="button"`.
- Selected state: `aria-pressed="true"` + visible Blue ring (`focus-visible:ring-2 ring-brand-primary`).
- Plan name + price announced together; no color-only meaning.

**Sport/specialization chips (existing defect — not keyboard accessible today):**
- Convert `<label>` + fake checkbox to real `<button role="checkbox" aria-checked={selected}>` or native checkbox inputs. Keyboard: Space/Enter toggles. Visible focus ring. Label associated via `aria-labelledby`.

**OnboardingStepper:**
- `aria-label="Onboarding progress"` retained. Each step: `aria-current="step"` on current, `aria-describedby` pointing to description text. Completed steps: check icon + `aria-label="Completado: {title}"`.

**Step navigation:**
- "Continuar"/"Back" buttons are real `<button>` elements with focus rings. `AnimatePresence` exits must not trap focus; focus moves to the new step's first interactive element.

**Reduced motion:**
- `prefers-reduced-motion`: stepper transitions and `AnimatePresence` become instant/opacity-only (150ms max). No framer-motion layout animations.

**WCAG AA contrast:**
- Body text on Blue CTA uses `--color-text-inverse` (`#111214`), never white.
- Error text uses `--color-error` (`#FF5A5F`) with alert icon; success uses `--color-success` with check icon.

---

## 8. Files affected (reference, no changes made by this spec)

- `apps/web/src/app/(marketing)/planes/page.tsx` → `PlansSection` (no code change; `href` already uses `?plan=`)
- `apps/web/src/app/(auth)/sign-up/page.tsx` + `SignUpForm.tsx` (plan banner, planType removal, exit route)
- `apps/web/src/app/(payment)/success/page.tsx` (NEW)
- `apps/web/src/app/(payment)/failed/page.tsx` (NEW)
- `apps/web/src/app/(payment)/pending/page.tsx` (NEW)
- `apps/web/src/app/(payment)/interstitial/page.tsx` (NEW)
- `apps/web/src/app/(auth)/onboarding/coach/page.tsx` + `CoachOnboarding.tsx` (read-only step 0, review step, exit to /coach/plan)
- `apps/web/src/app/(auth)/sign-in/page.tsx` (session-conflict redirect)
- `apps/web/src/features/auth/components/OnboardingStepper.tsx` (a11y: aria-current, aria-describedby)
- `docs/designs/T-006-coach-activation-flow.md` (this file)
