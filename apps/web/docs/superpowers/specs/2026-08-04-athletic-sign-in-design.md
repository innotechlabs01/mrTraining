# Athletic Sign-In Design

Date: 2026-08-04

## Problem

The mock login pages render white text (`text-white`, `text-white/40`,
`text-white/20`) on a theme-aware background. In light mode `--bg` resolves to
`#F8FAFC` (near-white), so the labels are effectively invisible. Affected pages:

- `/coach/login` (`src/app/coach/login/page.tsx`)
- Role selector on `/sign-in` (`src/app/(auth)/sign-in/page.tsx`)

There is no athlete/athletic mock login yet; the athlete experience has no
single entry point mirroring `/coach/login`.

## Goal

1. Fix the contrast bug by using theme-aware tokens so text is legible in both
   dark and light mode.
2. Create a new `/athletic/login` route with a mock athlete sign-in, improved
   over the coach version by showing athlete-relevant data (sport, plan, level,
   assigned coach) and redirecting to `/athlete/plan`.

## Fix 1 — Coach login contrast

In `src/app/coach/login/page.tsx`:

- `text-white` → `text-text-primary`
- `text-white/40` → `text-text-secondary`
- `text-white/20` → `text-text-muted`
- `border-white/10` → `border-surface-3`

No layout or behavior changes. Card backgrounds already use theme-aware
tokens (`bg-surface-1`, `bg-surface-2`).

## Fix 2 — /sign-in role selector contrast

In `src/app/(auth)/sign-in/page.tsx` role cards:

- `text-white` → `text-text-primary`
- `text-white/40` → `text-text-secondary`
- `text-white/30` / `text-white/50` (skip link) → `text-text-muted` / `text-text-secondary`
- `border-white/10` → `border-surface-3`
- `bg-white/[0.03]` / `bg-white/[0.06]` → keep (translucent, fine on both modes)

## Feature — /athletic/login

New route `src/app/athletic/login/page.tsx`, mirroring the coach login card
pattern with athlete mock users:

- Fields per user: `id`, `name`, `email`, `initials`, `sport`, `plan`,
  `level`, `coach`
- Mock athletes:
  - Luca Martínez — Fútbol · Performance · Avanzado · Coach: Alex Rivera
  - Sofía Torres — Baloncesto · Strength · Intermedio · Coach: María González
  - Ethan Brooks — Natación · General · Principiante · Coach: James Chen
- Card shows avatar (gradient), name, sport + plan + level badges, assigned
  coach, arrow affordance
- On select: write `{...user, role: 'Athlete'}` to localStorage key
  `mr-training-mock-user`, then `router.push('/athlete/plan')`
- Header: "MR" monogram + "Athlete Hub", title "Athlete Access", subtitle
  "Sign in to track your training and programs"
- Footer link: "I'm a Coach — Sign in here" → `/coach/login`
- Dev-mode note: "Modo desarrollo — autenticación simulada"
- Container/background theme-aware (same tokens as coach login)

## Data flow

- Shared localStorage key `mr-training-mock-user` keeps the existing mock-auth
  pattern (same key used by `MockAuthContext`). The athlete area currently
  does not gate on auth, so this is purely an entry point.
- `useRequireAuth` stays coach-scoped; no changes to it.

## Verification

- `pnpm lint`
- `pnpm build` (or `npx tsc --noEmit`)
- Manual: toggle dark/light, confirm both login pages and new `/athletic/login`
  are legible; selecting an athlete redirects to `/athlete/plan`.

## Out of scope

- Forcing dark mode on auth pages
- Changing `MockAuthContext` / `useRequireAuth` semantics
- Clerk `SignIn` flow changes
