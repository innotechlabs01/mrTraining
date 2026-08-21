# MR Training Mobile Redesign — Design Document

**Date:** 2026-08-21
**Status:** Approved (pending implementation plan)
**Scope:** apps/mobile (primary), apps/backend (audit + payment endpoints), apps/rules (docs update)

---

## 1. Context

The MR Training athlete app (React Native, TypeScript strict) currently uses a custom drawer
navigation with hand-built geometric icons, two conflicting design-token files
(`shared/theme/index.ts` and `shared/theme/designTokens.ts`), and hardcoded colors in most
screens. Brand rules mandate an orange primary (#FF6B00) that the user has rejected in favor of
a more professional look.

Several features are incomplete: Nutrition and Recovery are stubs, events are read-only,
the payment screen is a placeholder alert, and there is no workout detail or session-execution flow.

A prior refactor (session `ses_fdda4cdb1ffeVL3cThtizWmEgQ`) fixed auth/theme wiring issues; this
design builds on that foundation without reopening it.

## 2. Goals

1. Professional, premium visual identity across the whole app.
2. Complete the core athlete loops: training execution, event RSVP, membership renewal/payment.
3. One unified design system — zero hardcoded colors.
4. Business-action audit trail (`audit_logs`) for app and web.
5. Update brand/design rules so docs match reality.

## 3. Visual System (decided via interactive mockup review)

### 3.1 Color Tokens (dark-first)

Unified in a single file: `apps/mobile/src/shared/theme/tokens.ts`.
The legacy `theme/index.ts` and `theme/designTokens.ts` are deleted; all imports migrate.

| Role | Value |
|---|---|
| Base | `#111214` |
| Surface | `#191B1E` |
| SurfaceRaised | `#202329` |
| Border | `#26292E` |
| Primary (Volt) | `#C8FF00` |
| PrimaryPressed | `#A8D900` |
| Text | `#F5F5F7` |
| TextSecondary | `#9CA3AF` |
| Success | `#34D399` |
| Warning | `#FBBF24` |
| Error | `#FF5A5F` |

Rules: Volt is the single accent — one primary CTA per screen. Surfaces layer by tonal
difference, not borders. Contrast must pass WCAG AA on text roles.

### 3.2 Typography

Installed via `@expo-google-fonts/*` (no font deps exist today):

- **Display/numerals/titles:** Archivo (Expanded feel, weights 700–900, tight letter-spacing on big numerals)
- **UI/body:** Inter 400–800

Scale: display 40–48 · title 20 · body 15 · label 11 uppercase, tracking ~2px.

### 3.3 Navigation — Floating Glass Dock

Drawer is removed. React Navigation `bottom-tabs` with a custom `GlassDock` tab bar:
detached from the bottom edge (~22px), translucent background with blur
(`BlurView`, fallback solid rgba on Android), luminous border, animated dot indicator
under the active tab.

```
AthleteTabs (4 tabs)
├── Hoy      → TodayScreen
├── Plan     → HistoryScreen → WorkoutDetailScreen (new)
├── Eventos  → EventsScreen → EventDetailScreen (new)
└── Perfil   → ProfileScreen → MembershipScreen, StoreScreen
```

Full-screen modal stacks (outside tabs): `WorkoutExecutionScreen`, `PaymentScreen`.

Unchanged: Clerk auth flow, deep linking (`mrtraining://`, universal links),
`MembershipGate` wrapping the tab area. Membership and Store live inside Perfil as prominent
cards; Today shows a membership banner when status is expiring (<7 days) or expired.
Adaptive side rail for tablets is documented as future work, out of scope.

### 3.4 Entry Flow (restructured)

```
SplashScreen (validates Clerk session)
├── session active ──→ AthleteTabs
└── no session ─────→ WelcomeScreen ("I'm new" / "I already train")
      ├── I'm new ───→ OnboardingScreen → Auth (signup mode)
      └── I train ───→ Auth (signin mode)
```

- **SplashScreen**: brand moment (wordmark + Volt accent, subtle animation) while Clerk
  session resolves — replaces today's decorative 3.8s timer with a functional gate.
  Signed-in users land directly on Tabs.
- **WelcomeScreen**: chooser between new-athlete onboarding and returning sign-in.
  Visual migration to tokens only.
- **OnboardingScreen**: keeps its 7 steps (sport selector, modality/level, goal, schedule,
  equipment, summary, routine acceptance). Each step gains a hero image, Next/Back buttons,
  and a Skip action that jumps straight to the final step. Data validation per step unchanged.
  **Bug fix included:** collected `OnboardingData` is currently written to a Context nobody
  consumes — it must be persisted/sent via the existing `/athlete/onboard` endpoint.
  Step hero images are static bundled assets (one per step); no network fetch.
- **AuthFlowScreen**: its inline state machine (splash→welcome phases) is dissolved into the
  navigator — splash and welcome become proper routes driven by Clerk session state.
- **Auth/SignInScreen**: logic unchanged — email + password + mandatory coach code in both
  modes, invite-code prefill from deep links. Visual redesign only (glass inputs, single Volt CTA).

`InviteAcceptScreen` keeps its role; visuals migrate to tokens.

## 4. Shared Component Kit

New: `apps/mobile/src/shared/components/ui/`

`PrimaryButton` · `Card` · `Badge` · `ScreenHeader` · `GlassDock` · `ProgressBar` · `Input` ·
`EmptyState` (with loading skeleton / error+retry / empty variants).

All consume tokens. No screen may define colors inline (lint-enforced where feasible).
Icons replace the hand-built View compositions with `react-native-svg` icon set
(single dependency), tinted via tokens.

## 5. Feature Designs

### 5.1 Training — full flow

- `WorkoutDetailScreen`: exercises with sets × reps × target weight; media if API provides it.
- `WorkoutExecutionScreen`: one exercise per screen; per-set weight/reps entry; large
  "next set" button (48dp+ targets); progress bar at top.
- Local persistence of in-progress session (AsyncStorage): crash/app-kill mid-workout resumes
  where the user left off.
- Completion summary screen → marks workout complete via existing API.

### 5.2 Events — coach-defined RSVP

Coach defines each event's structure from the web dashboard. Mobile renders accordingly:

- **Option list** → athlete picks one option
- **Checklist** → athlete marks applicable items
- **Form** → dynamic fields defined by the coach (text/number/select)

Buttons: Accept / Cancel attendance; response state visible after submit.
Event payments explicitly deferred.

### 5.3 Membership & Payments — Polar

- Renewal generates a Polar checkout session via backend → opens Polar-hosted checkout
  (system browser / ASWebAuthenticationSession) → deep link back `mrtraining://payment/success`.
- On return, the app queries actual membership status from the backend before showing success;
  the URL alone is never trusted.
- Existing membership status + payments history screens get restyled, logic unchanged.

### 5.4 Audit Logging (backend, serves app + web)

Turso table:

```sql
audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  metadata TEXT,          -- JSON
  created_at TEXT NOT NULL
)
```

Backend endpoints record business actions and failures: payment attempts/outcomes,
membership changes, workout completions, RSVP accept/cancel, auth failures.
Sentry integration explicitly deferred to a later change — do not add the SDK now.

## 6. Error Handling

Every queried screen implements three states via `EmptyState`: loading (volt skeleton),
error (retry), empty. Payment flow verifies server-side state before confirming success.
Workout execution survives process death via AsyncStorage resume.

## 7. Testing

- Unit: workout execution logic (sets, progress, resume) and dynamic event form rendering/validation.
- Component tests: UI kit basics.
- Existing tests must keep passing; pure restyle adds no new test burden beyond kit coverage.
- Follows `13-testing.md` and mobile testing rules.

## 8. Rules & Docs Updates

Rewrite `01-brand-guidelines.md` (orange → Volt system), update `02-design-system.md`
(tokens, typography, components), touch up `06-frontend-architecture.md` and mobile-rules
where drawer/orange references remain stale.

## 9. Out of Scope

Per-event payments · tablet adaptive rail · Sentry SDK · Nutrition/Recovery features
(hidden from navigation; code untouched) · coach-side web dashboard changes beyond audit logging.

## 10. Delivery Plan (foundation-first, approved)

1. **Phase A — Foundation:** unified tokens.ts, fonts installed, SVG icons, UI kit, rules rewrite.
2. **Phase B — Restyle:** migrate all existing screens to tokens + kit (entry screens per §3.4);
   swap drawer → GlassDock.
3. **Phase C — Features:** training flow, event detail/RSVP forms, Polar payment flow.
4. **Phase D — Audit:** `audit_logs` table + backend recording endpoints.

Each phase lands as reviewable work units with verification before the next starts.
