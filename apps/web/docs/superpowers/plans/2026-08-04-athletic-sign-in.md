# Athletic Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix invisible-text contrast bugs on the mock login pages and add a new `/athletic/login` mock athlete sign-in.

**Architecture:** Replace hardcoded `text-white` classes with theme-aware tokens (`text-text-primary`/`text-text-secondary`/`text-text-muted`) backed by CSS variables. Add a `text-muted` color token to the Tailwind config (the CSS var `--text-muted` already exists in `globals.css`). New `/athletic/login` mirrors the coach login card pattern with athlete mock users and richer metadata.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS 3.4, TypeScript, lucide-react. No test framework is wired (jest runs `--passWithNoTests`), so verification is `pnpm lint` + `pnpm build` + manual check.

**Spec:** `docs/superpowers/specs/2026-08-04-athletic-sign-in-design.md`

---

### Task 1: Add `text-muted` color token

**Files:**
- Modify: `tailwind.config.ts:57` (colors map)

- [ ] **Step 1: Add the token**

In the `colors` block, change the existing line:

```ts
'text-primary': 'var(--text)',
'text-secondary': 'var(--text-secondary)',
```

to:

```ts
'text-primary': 'var(--text)',
'text-secondary': 'var(--text-secondary)',
'text-muted': 'var(--text-muted)',
```

This makes the `text-text-muted` utility class compile (the `--text-muted` CSS var is already defined in `src/app/globals.css`).

- [ ] **Step 2: Verify the config loads**

Run: `pnpm build`
Expected: Build starts and compiles the config without errors (it may fail later on lint — that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: add text-muted color token"
```

---

### Task 2: Fix coach login contrast

**Files:**
- Modify: `src/app/coach/login/page.tsx`

- [ ] **Step 1: Replace the file contents with the theme-aware version**

Full replacement content:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Dumbbell, ArrowRight } from 'lucide-react'

const COACH_USERS = [
  { id: 'coach-1', name: 'Alex Rivera', email: 'alex@mr-training.com', role: 'Head Coach', initials: 'AR', coachPlan: 'performance', coachLevel: 'expert', specialization: 'Sports Performance', athletesCount: 12 },
  { id: 'coach-2', name: 'María González', email: 'maria@mr-training.com', role: 'Strength Coach', initials: 'MG', coachPlan: 'strength', coachLevel: 'advanced', specialization: 'Strength & Conditioning', athletesCount: 8 },
  { id: 'coach-3', name: 'James Chen', email: 'james@mr-training.com', role: 'Performance Coach', initials: 'JC', coachPlan: 'general', coachLevel: 'intermediate', specialization: 'General Fitness', athletesCount: 5 },
]

export default function CoachLoginPage() {
  const router = useRouter()

  const handleLogin = (user: (typeof COACH_USERS)[number]) => {
    localStorage.setItem('mr-training-mock-user', JSON.stringify(user))
    router.push('/coach/plan')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary font-display font-bold text-sm">
              MR
            </div>
            <span className="font-display text-lg font-semibold text-text-primary tracking-wide">
              Coach OS
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-text-primary">Coach Access</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to manage your athletes and programs</p>
        </div>

        <div className="space-y-3">
          {COACH_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => handleLogin(u)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-3 bg-surface-1 hover:bg-surface-2 hover:border-brand-primary/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-sm font-bold shrink-0">
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                  {u.name}
                </p>
                <p className="text-xs text-text-secondary">{u.role}</p>
              </div>
              <div className="text-text-muted group-hover:text-brand-primary/50 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href="/athletic/login" className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
            I&apos;m an Athlete — Sign in here
          </a>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          Modo desarrollo — autenticación simulada
        </p>
      </div>
    </div>
  )
}
```

Key changes: `text-white` → `text-text-primary`, `text-white/40` → `text-text-secondary`, `text-white/20` → `text-text-muted`, `border-white/10` → `border-surface-3`, and the footer athlete link now points to `/athletic/login`. Avatar initials stay `text-white` (always on a brand gradient).

- [ ] **Step 2: Lint the file**

Run: `pnpm lint`
Expected: No errors in `src/app/coach/login/page.tsx` (pre-existing unrelated warnings are acceptable).

- [ ] **Step 3: Commit**

```bash
git add src/app/coach/login/page.tsx
git commit -m "fix: theme-aware colors on coach login"
```

---

### Task 3: Fix /sign-in role selector contrast

**Files:**
- Modify: `src/app/(auth)/sign-in/page.tsx`

- [ ] **Step 1: Replace the role selector block and skip link**

Replace the `ROLES.map(...)` button block (lines ~35-51) with:

```tsx
                <motion.button
                  key={r.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-5 rounded-xl border border-surface-3 bg-surface-1 hover:bg-surface-2 transition-colors text-center',
                    role === r.id && 'border-brand-primary bg-brand-primary/5',
                  )}
                >
                  <r.icon size={28} className="text-brand-primary" />
                  <span className="text-sm font-semibold text-text-primary">{r.label}</span>
                  <span className="text-xs text-text-secondary">{r.desc}</span>
                </motion.button>
```

Replace the "I am a:" intro line `text-sm text-white/50 text-center mb-2` with `text-sm text-text-secondary text-center mb-2`.

Replace the "Skip & continue as Athlete" button class `mt-2 text-xs text-white/30 hover:text-white/50 transition-colors` with `mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors`.

- [ ] **Step 2: Lint the file**

Run: `pnpm lint`
Expected: No errors in `src/app/(auth)/sign-in/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(auth)/sign-in/page.tsx'
git commit -m "fix: theme-aware colors on sign-in role selector"
```

---

### Task 4: Create /athletic/login page

**Files:**
- Create: `src/app/athletic/login/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Dumbbell, ArrowRight } from 'lucide-react'

const ATHLETE_USERS = [
  { id: 'athlete-1', name: 'Luca Martínez', email: 'luca@mr-training.com', initials: 'LM', sport: 'Fútbol', plan: 'Performance', level: 'Avanzado', coach: 'Alex Rivera' },
  { id: 'athlete-2', name: 'Sofía Torres', email: 'sofia@mr-training.com', initials: 'ST', sport: 'Baloncesto', plan: 'Strength', level: 'Intermedio', coach: 'María González' },
  { id: 'athlete-3', name: 'Ethan Brooks', email: 'ethan@mr-training.com', initials: 'EB', sport: 'Natación', plan: 'General', level: 'Principiante', coach: 'James Chen' },
]

export default function AthleticLoginPage() {
  const router = useRouter()

  const handleLogin = (user: (typeof ATHLETE_USERS)[number]) => {
    localStorage.setItem('mr-training-mock-user', JSON.stringify({ ...user, role: 'Athlete' }))
    router.push('/athlete/plan')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary font-display font-bold text-sm">
              MR
            </div>
            <span className="font-display text-lg font-semibold text-text-primary tracking-wide">
              Athlete Hub
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-text-primary">Athlete Access</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to track your training and programs</p>
        </div>

        <div className="space-y-3">
          {ATHLETE_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => handleLogin(u)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-3 bg-surface-1 hover:bg-surface-2 hover:border-brand-primary/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-sm font-bold shrink-0">
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                  {u.name}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary">{u.sport}</span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">{u.plan}</span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">{u.level}</span>
                </div>
                <p className="text-xs text-text-muted mt-1">Coach: {u.coach}</p>
              </div>
              <div className="text-text-muted group-hover:text-brand-primary/50 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href="/coach/login" className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
            I&apos;m a Coach — Sign in here
          </a>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          Modo desarrollo — autenticación simulada
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint the file**

Run: `pnpm lint`
Expected: No errors in `src/app/athletic/login/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/athletic/login/page.tsx
git commit -m "feat: add athletic mock sign-in"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: Exit 0, no errors in any of the touched files.

- [ ] **Step 2: Run a production build**

Run: `pnpm build`
Expected: Build succeeds with all routes compiled, including `/athletic/login`.

- [ ] **Step 3: Manual check (both themes)**

Run: `pnpm dev`, open:
- `/coach/login` in dark AND light OS theme (or toggle via next-themes) — labels must be legible
- `/sign-in` in both themes — role cards legible
- `/athletic/login` — cards legible, badges show sport/plan/level/coach
- Click "Luca Martínez" → redirects to `/athlete/plan` and `localStorage.mr-training-mock-user` contains `{"role":"Athlete",...}`
- Cross-links: `/coach/login` ↔ `/athletic/login` work

- [ ] **Step 4: Commit any verification fixes**

If the manual check surfaced issues, fix them in the relevant file and commit. Otherwise no commit needed.
