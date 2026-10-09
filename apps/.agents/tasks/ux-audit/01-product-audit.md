# MR Training — Comprehensive UX/UI Product Audit

**Date:** 2026  
**Auditor:** Senior Product Designer / UI/UX Architect (AI Agent)  
**Scope:** Web (Landing + Coach Platform), Mobile App (Athlete), API constraints  
**Workspace root:** `/Users/frg/Documents/Innotechlabs/Mao_Coaching/webs/mr-training/apps`

---

## Executive Summary

MR Training is a multi-surface Fitness SaaS: a Next.js 14 web platform for Coaches, an Expo 54 / React Native mobile app exclusively for Athletes, and a Go backend API as the single data source. The product has a well-defined, documented design system (`rules/02-design-system.md`, `rules/01-brand-guidelines.md`) and canonical token files that are mostly, but not perfectly, followed in implementation.

**Strongest surfaces:** Mobile App — the training execution flow and token discipline are production-quality; the GlassDock tab bar, ContinueWorkoutCard, and ExerciseCard are tight, accessible, and fitness-native.

**Weakest surface:** Landing Page — it is a stub. A fully-featured public marketing page does not exist; what exists is a minimal placeholder with a title, description, and two CTAs. This is the highest-priority design gap.

**Critical inconsistencies:** The web app uses `font-display: Montserrat` + `font-body: Inter` in `tailwind.config.ts` and references `Archivo` in `rules/02-design-system.md` as the display font, while mobile uses Inter throughout. Web typography is misaligned with the canonical design system. Additionally, the web sign-in page only exposes a "Coach" role selector; the Athlete role is absent — which contradicts the product being two-sided.

---

## 1. Product Structure Overview

| Surface | Path | Framework | Purpose |
|---------|------|-----------|---------|
| **Web** | `apps/web/` | Next.js 14 App Router | Landing page + Coach Platform |
| **Mobile** | `apps/mobile/` | Expo 54, React Native 0.81 | Athlete-only mobile app |
| **API** | `apps/api/` | Go 1.25, Fiber v2, Turso/LibSQL | Single data source for both clients |

### App Router structure (web)

```
src/app/
  (marketing)/          → Public landing page
  (auth)/               → Sign-in, sign-up, onboarding, invite flows
  (app)/coach/          → All coach platform pages (guarded)
  api/                  → Server-side API routes (webhooks, SSR, Clerk)
  [locale]/             → Locale routing (next-intl)
```

### Mobile navigation structure

```
RootNavigator (NativeStack)
  ├── Splash / Welcome / Auth / Onboarding   → Unauthenticated
  └── AthleteTabs (GlassDock)                → Authenticated
        ├── Today       (TodayScreen)
        ├── Plan        (HistoryScreen)
        ├── Events      (EventsScreen)
        ├── Recovery    (RecoveryScreen)
        └── Profile     (ProfileScreen)
    + Modal / Stack screens: WorkoutExecution, WorkoutDetail, Progress,
      Nutrition, Community, Settings, Challenges, Leaderboard, AiWorkout, …
```

---

## 2. Tech Stack Per App

### Web (`apps/web/`)

| Layer | Choice | Version/Notes |
|-------|--------|---------------|
| Framework | Next.js | `^14.2.15`, App Router |
| UI | React | `^18.3.1` |
| Styling | Tailwind CSS | `^3.4.13`, dark-mode via `class` |
| Typography fonts | Montserrat (display), Inter (body), JetBrains Mono | `globals.css` + `tailwind.config.ts` |
| Component library | Custom (one `components/ui/card.tsx`, `components/landing/logo.tsx`) | Essentially no shared component lib; coach features self-contain components |
| State / data fetching | TanStack Query 5 | `^5.102.8` |
| Auth | Clerk Next.js | `^6.38.3` |
| Animation | Framer Motion | `^11.11.0` |
| Icons | Lucide React | `^0.451.0` |
| Rich text editor | CKEditor 5 | `^44.3.0` |
| Maps | Leaflet / React Leaflet | `1.9.x` |
| Toasts | Sonner | `^2.0.8` |
| Database (web-side) | Turso/LibSQL | `@libsql/client ^0.17.4` |
| Payments | Polar | `@polar-sh/sdk ^0.49.0` |
| i18n | next-intl | `^3.0.0` |
| Testing | Jest + Playwright | Unit + E2E |

### Mobile (`apps/mobile/`)

| Layer | Choice | Version/Notes |
|-------|--------|---------------|
| Framework | Expo | `~54.0.0` |
| Runtime | React Native | `^0.81.5` |
| Language | TypeScript | `~5.9.2`, strict |
| Navigation | React Navigation 7 | Bottom tabs + native stack |
| Data fetching | TanStack Query 5 | `^5.0.0` |
| State | Zustand | `^5.0.15` |
| Storage | MMKV | `react-native-mmkv ^4.3.2` |
| Auth | Clerk Expo | `^2.19.0` |
| Animations | Reanimated | `~4.1.1` |
| Lists | FlashList | `2.0.2` |
| Forms | React Hook Form | `^7.89.0` |
| Validation | Zod | `^4.6.5` |
| Health | HealthKit (iOS), Health Connect (Android) | `@kingstinct/react-native-healthkit`, `react-native-health-connect` |
| Camera / AI | Vision Camera | `^5.2.3` |
| Icons | Custom SVG (react-native-svg) | `src/shared/components/icons/index.tsx` |
| i18n | i18next + react-i18next | Locales: es, es-AR, es-ES, es-MX, en, en-US, en-GB |

### API (`apps/api/`)

| Layer | Choice |
|-------|--------|
| Language | Go 1.25 |
| Framework | Fiber v2 |
| Database | Turso/LibSQL |
| Cache | Redis 7 |
| Messaging | NATS JetStream |

---

## 3. Design System Inventory

### 3.1 Colors

#### Canonical Brand Accent
- **MR Blue:** `#15AAF2` — single accent across all surfaces
- **Pressed state:** `#0E93D4` (web) / `#0E93D4` (mobile — `primaryPressed`)
- Legacy Volt `#C8FF00` is **retired** (documented in `rules/01-brand-guidelines.md` §4)

#### Mobile Tokens (`src/shared/theme/tokens.ts` — canonical source)

| Token | Hex | Role |
|-------|-----|------|
| `colors.base` | `#0B0F0E` | App background, deepest layer |
| `colors.surface` | `#151B19` | Cards, lists, main content surfaces |
| `colors.surfaceRaised` | `#1C2320` | Elevated rows, inputs, chips |
| `colors.border` | `#242B28` | Hairlines, separators |
| `colors.primary` | `#15AAF2` | MR Blue — single accent |
| `colors.primaryPressed` | `#0E93D4` | Pressed state |
| `colors.primarySoft` | `#15AAF21A` | Selected tints, chips |
| `colors.primaryFaint` | `#15AAF20F` | Subtle pressed/active feedback |
| `colors.secondary` | `#3B9EFF` | Data-viz / macro secondary (sparingly) |
| `colors.text` | `#FFFFFF` | Primary text |
| `colors.textSecondary` | `#9CA3AF` | Captions, placeholders |
| `colors.success` | `#34D399` | Positive states |
| `colors.warning` | `#FBBF24` | Warnings |
| `colors.error` | `#FF6B6B` | Destructive / errors |
| `colors.overlay` | `#00000099` | Scrims over modals/media |

#### Web Tokens (`globals.css` CSS custom properties)

| Token | Light Hex | Dark Hex |
|-------|-----------|----------|
| `--color-brand-primary` | `#15AAF2` | `#15AAF2` |
| `--bg` | `#F8FAFC` | `#0A0B0D` |
| `--bg-elevated` | `#FFFFFF` | `#0F0F0F` |
| `--bg-card` | `#FFFFFF` | `#141416` |
| `--border` | `#E2E8F0` | `#1C1C1C` |
| `--text` | `#0F172A` | `#FFFFFF` |
| `--text-secondary` | `#475569` | `#9CA3AF` |
| `--text-muted` | `#94A3B8` | `#6B7280` |
| `--color-success` | `#00C853` | `#00C853` |
| `--color-error` | `#FF3D00` | `#FF3D00` |
| `--color-warning` | `#FFB300` | `#FFB300` |

> **Note:** Web surface scale has 7 steps (`surface-0` through `surface-6`) mapped through Tailwind config. Mobile has a 3-level surface hierarchy (base / surface / surfaceRaised).

#### ⚠️ Inconsistency: Semantic color divergence

Web `--color-error`: `#FF3D00` (orange-red)  
Mobile `colors.error`: `#FF6B6B` (salmon-red)  
Design system doc: `#FF5A5F`  
These are three different error reds across three files — a visible inconsistency in semantic states.

Web `--color-success`: `#00C853` (neon green)  
Mobile `colors.success`: `#34D399` (emerald-500)  
Design system doc: `#34D399`  
The web CSS variable doesn't match the token spec.

### 3.2 Typography

#### Mobile
- **Display/Heading font:** Inter exclusively (`fontFamilies.display = 'Inter_800ExtraBold'`)
- **Body font:** Inter (`Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`)
- **Scale:** `display` (34px/40px, uppercase), `h1` (30px, uppercase), `h2` (24px, uppercase), `h3` (20px), `h4` (17px), `bodyLG/body/bodySmall/caption/overline`
- **Metric numerals:** `metricXL` (56px), `metricLG` (44px), `metricMD` (32px), `metricSM` (24px) — all Inter_800ExtraBold, tabular-nums, tight tracking
- **Label:** Inter_700Bold, 13px, uppercase, `letterSpacing: 0.08`

#### Web (`tailwind.config.ts` + `globals.css`)
- **Display font:** `Montserrat` (`font-display`)
- **Body font:** `Inter` (`font-body`)
- **Mono:** `JetBrains Mono`
- **Scale:** `display` (48px/1.1/800), `h1` (36px/1.2/700), `h2` (28px/1.25/700), `h3` (22px/1.3/600), `h4` (18px/1.35/600), `body-lg` (18px), `body` (16px), `body-sm` (14px), `caption` (12px), `overline` (11px)

#### ⚠️ Inconsistency: Display font mismatch
- Web implementation: `Montserrat`
- Design system spec (`rules/02-design-system.md §1.2`): `Archivo`
- Mobile: `Inter`
- All three disagree on the display typeface.

### 3.3 Spacing

Mobile tokens:
```ts
xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64
```
Page padding: `24px` | Card padding: `16px` | Touch target min: `48px`

Web: Tailwind default spacing scale + `section: 6rem` custom + `pagePadding` per component. No formal token mapping to Tailwind utilities — each component uses ad-hoc `p-*`, `gap-*`, `px-*` classes.

### 3.4 Border Radius

Mobile:
```ts
sm: 8px, md: 12px, lg: 16px, xl: 24px, full: 9999
```

Web (`tailwind.config.ts`):
```ts
sm: '4px', md: '8px', lg: '12px'
```
Plus inline overrides: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px) used extensively in dashboard components.

> **Note:** Web radius tokens and actual usage are misaligned. `rounded-lg` in web Tailwind = 12px (configured), but default Tailwind `rounded-lg` = 8px — the override is in place but inconsistently named vs mobile (mobile `md = 12`, web `lg = 12`).

### 3.5 Shadows

Mobile: `sm`, `md`, `glow` (MR Blue glow: `shadowColor: '#15AAF2', shadowOpacity: 0.3, shadowRadius: 20`)  
Web: Inline `shadow-*` Tailwind classes + `fire-glow` CSS utility (`box-shadow: 0 0 24px rgba(21, 170, 242, 0.45)`)

### 3.6 Icons

- **Mobile:** Custom SVG icons in `src/shared/components/icons/index.tsx` (react-native-svg), 40+ icons defined inline. Custom, stroke-based, consistent weight.
- **Web (Coach):** Lucide React (`lucide-react ^0.451.0`) — `LayoutDashboard, Users, Dumbbell, Calendar, Bell, AlertTriangle`, etc.
- **Web (Auth/Landing):** Mix of Lucide icons + none

> **Strength:** Mobile icon system is self-contained and consistent. Every icon accepts `{size, color}` props and defaults to `textSecondary`.  
> **Problem:** Web uses Lucide while mobile is custom SVG. Cross-platform visual language differs by icon style (Lucide is thinner and rounder; custom mobile icons are slightly heavier and purpose-built for fitness).

---

## 4. Screen / Page Inventory

### 4.1 Web — Coach Platform

**Authentication / Onboarding**
- `/` → `(marketing)/page.tsx` — Landing Page stub (placeholder only)
- `/(auth)/sign-in` — Coach sign-in with role selector (Coach only)
- `/(auth)/sign-up` — Sign-up
- `/(auth)/onboarding/coach` — Coach profile setup (specialization, level, certifications)
- `/(auth)/welcome-dashboard` — Welcome screen post-onboarding
- `/(auth)/forgot-password`, `/verify`, `/mfa`, `/sso-callback`, `/setup`
- `/(auth)/invite/coach`, `/(auth)/invite/organization`
- `/(auth)/role-selection`

**Coach Platform (all require auth)**
- `/coach` → Dashboard (CoachDashboard component — real-time metrics, revenue, athlete readiness, events, sales charts)
- `/coach/today` → TimeBlock-based daily workflow (morning-brief, check-in, session-prep, live-session, mid-day, program-design, communication, insights, daily-summary, evening-recap)
- `/coach/users` → Athlete list with flags/readiness
- `/coach/users/[id]` → Athlete detail
- `/coach/agendamiento` → Scheduling
- `/coach/workouts/exercises` → Exercise library + WorkoutBuilder + TemplateGallery
- `/coach/training/asignar` → Workout assignment to athletes
- `/coach/planes` → Subscription plans management
- `/coach/events` → Events management (types: lista, formulario, running)
- `/coach/live-session` → Live sessions with real-time athlete metrics
- `/coach/ventas` → Sales / inventory management
- `/coach/blog` → Blog editor (CKEditor 5 rich text)
- `/coach/challenges` → Challenge management
- `/coach/settings` → Coach settings
- `/coach/support` → Support tickets
- `/coach/video-analytics` → Video form analysis
- `/coach/plan` → Coach subscription plan
- `/coach/landing` → Coach's public landing page editor

**Nutrition (separate sub-section under coach)**
- `/(app)/nutrition/meal-plans`
- `/(app)/nutrition/recipes`
- `/(app)/nutrition/shopping-lists`

### 4.2 Mobile — Athlete App

**Auth Flow**
- `Splash` — App loading / auth check
- `Sliders (OnboardingSlidersScreen)` — Onboarding slides (fitness-themed)
- `Welcome (WelcomeScreen)` — Hero background image + "new user" / "existing user" card pair
- `Auth (SignInScreen)` — Clerk-powered sign-in/sign-up
- `Onboarding (OnboardingScreen)` — Athlete profile setup
- `InviteAccept` — Athlete invite code

**Main Tabs (AthleteTabs)**
- `Today (TodayScreen)` — Header → ContinueWorkoutCard → ActivityRings (readiness) → Scoreboard → Sessions → PRs → Challenge → NewsFeed
- `Plan (HistoryScreen)` — Training history / plan overview
- `Events (EventsScreen)` — Events list
- `Recovery (RecoveryScreen)` — HRV, sleep, resting HR + manual check-in + recommendations
- `Profile (ProfileScreen)` — Athlete profile, settings entry

**Stack / Modal Screens**
- `WorkoutDetail` — Workout detail before starting
- `WorkoutExecution` (modal) — Active workout: ExerciseCard, RepCounter, WeightInput, SetInput, RIR, FormAnalyzer, RestOverlay, CompletionSummary
- `AiWorkout` (modal) — AI form analysis via camera
- `Progress` — Progress stats: period selector (week/month/year), analytics summary, per-exercise analytics, leaderboard
- `Nutrition` — Nutrition tracking
- `Community` — Articles, DiscussionForum, ChallengeDetail, WeeklyChallenge, Leaderboard, ChallengeRecording
- `Search` — Global search
- `Settings` — SettingsScreen → NotificationSettings, PasswordSettings
- `PersonalData`, `TrainingPreferences`, `EmergencyContact` — Profile sub-screens
- `Favorites` — Saved workouts/exercises
- `Help` — Help content
- `Notifications` — Notification center
- `Membership (MembershipScreen)` — Paywall / subscription management
- `Store` — Product store
- `ImportHistory` — Import historical training data
- `EventDetail` — Event detail view
- `CreateRoutine` — Athlete-created custom routine

---

## 5. Component Inventory

### 5.1 Mobile — Shared UI Components (`src/shared/components/ui/`)

| Component | Notes |
|-----------|-------|
| `AlertBanner` | Contextual alert bar |
| `Badge` | Status/label badge |
| `BentoGrid` | Grid layout helper |
| `Card` | Base card with padding + surface styling |
| `ChallengeHomeCard` | Challenge CTA for Today screen |
| `ConsentDialog` | GDPR/consent modal |
| `CountdownTimer` | Generic timer UI |
| `DayStrip` | Horizontal scrollable day picker |
| `EmptyState` | `loading/skeleton/empty/error` variants — always skeletons, never spinner |
| `GlassDock` | Custom frosted-glass bottom tab bar |
| `Input` | Styled text input |
| `ListCard` | Row-style list card |
| `MetricCard` | Big-number display with label, trend, unit |
| `OfflineBanner` | Offline connectivity indicator |
| `PrimaryButton` | `primary/ghost/outline/subtle` variants, `md/lg` sizes |
| `ProgressBar` | Linear fill bar |
| `ScreenHeader` | Standard screen header with back button |
| `SectionHeader` | Section label + optional action |
| `SegmentedFilter` | Segmented control (period selector) |
| `SessionListCard` | Session row card |
| `Skeleton` | Shimmer skeleton primitives |
| `StatCard` | Compact stat display |
| `StatGrid` | 2-col grid of StatCards |
| `SubScreenHeader` | Sub-screen navigation header |
| `Toast` | In-app toast notification |

### 5.2 Mobile — Fitness Components (`src/shared/components/fitness/`)

| Component | Notes |
|-----------|-------|
| `ActivityRings` | 3-ring circular progress (Move/Exercise/Recovery) with SVG — colors: MR Blue `#15AAF2`, emerald `#34D399`, `#3B9EFF` |
| `ContinueWorkoutCard` | Dominant hero card on Today; primary-colored with glow shadow, progress bar, play button |
| `RestTimer` | Countdown timer for rest periods |
| `WorkoutCard` | Workout preview card |

### 5.3 Mobile — Gamification Components (`src/shared/components/gamification/`)

| Component | Notes |
|-----------|-------|
| `AchievementBadge` | Badge display |
| `BadgeUnlockToast` | Toast triggered on badge unlock |
| `Leaderboard` | Leaderboard list |
| `PRCelebrationAnimation` | Personal record celebration |
| `StreakBadge` | Streak counter badge |

### 5.4 Mobile — Execution Components (`features/training/presentation/components/execution/`)

| Component | Notes |
|-----------|-------|
| `ExerciseCard` | Name, prescription detail, AI rationale, set progress, demo button |
| `FormVerdictBadge` | AI form quality badge |
| `RestOverlay` | Full-screen rest timer overlay |
| `SetInput` | Input for sets/reps/seconds/RIR |
| `CompletionSummary` | Post-workout summary with PRs |
| `AiWorkoutCta` | AI camera mode entry point |
| `ExerciseDemoModal` | Video demo modal |
| `PendingSyncBadge` | Offline sync status indicator |

### 5.5 Web — Coach Feature Components (selected)

| Component | Notes |
|-----------|-------|
| `CoachLayout` | Root layout: sidebar + topbar + right panel |
| `CoachSidebar` | Fixed 240px sidebar with collapsible sections + today's timeline |
| `TopBar` | Fixed 56px header: hamburger (mobile), date, current block, theme toggle, notifications, user avatar + logout |
| `CoachDashboard` | Full dashboard: hero greeting, quick actions, athlete readiness, 4 metric cards, goals/streaks, revenue chart, events, attention list, plan distribution, sales charts, top products, activity feed |
| `DashboardCard` | Reusable framer-motion card with hover-lift animation |
| `MetricCard` | Animated count-up number card with trend indicator |
| `ProgressBar` | Animated progress fill bar |
| `EmptyState` / `EmptyStateInline` | Coach-specific empty states |
| `WorkoutBuilder` | Multi-step workout creation with exercise library |
| `ExerciseLibrary` | Searchable, filterable exercise database |
| `TemplateGallery` | Workout template browser |
| `RouteMapEditor` | Running route map editor (Leaflet) |
| `AIInsights` | AI-generated insights cards (athlete trends, anomaly detection) |
| `AthleteCheckIn` | Athlete check-in list with flags and readiness indicators |
| `AthleteReadinessCard` | Per-athlete readiness display |
| `Communication` + `CommunicationHub` + `MessageThread` | Messaging system |
| `MorningBrief` / `DailySummary` | AI time-block components |
| `CoachNav` + `CoachSidebar` | Dual navigation system (CoachNav is plan-aware; CoachSidebar is the visible implementation) |

---

## 6. Current UX Patterns

### 6.1 Web — Navigation

- **Pattern:** Fixed sidebar (`w-60`, `z-30`) + fixed topbar (`h-14`, `z-20`) + main content (`pt-14 ml-60`)
- **Mobile breakpoint:** Sidebar slides in on hamburger click (transform animation). Desktop: always visible.
- **Sidebar sections:** Dashboard, Users, Agendamiento, Training (collapsible: Workouts, Asignar), Comercial (collapsible: Planes, Events, Live Sessions, Ventas), Settings, Soporte + Today's Timeline (collapsible)
- **Active state:** `text-brand-primary bg-brand-primary/10` highlight
- **Right panel:** Context-sensitive slide-over (messages, athlete details)
- **Today's timeline:** Accessible from sidebar — block-based day structure (morning-brief → check-in → session-prep → live-session → mid-day → program-design → communication → insights → daily-summary → evening-recap)

### 6.2 Web — Forms

- Inline validation via Clerk (auth forms) + custom form components
- CKEditor 5 for blog/rich-text
- Route map editor with Leaflet for running programs
- Workout builder uses drag/drop order, AMRAP/failure reps modes, weight, rest config per exercise

### 6.3 Web — Data States

- Loading: inline spinner (`h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent`)
- Skeleton: framer-motion opacity pulse animation on skeleton rows
- Error: `EmptyState` with `AlertCircle` icon + retry button
- Empty: `EmptyState` with descriptive icon + action button
- Server-side prefetch: coach dashboard queries prefetched in Next.js server component, hydrated on client (HydrationBoundary)

### 6.4 Mobile — Navigation

- **Pattern:** Bottom tab bar (GlassDock) as primary navigation
- **Tab structure:** Today / Plan / Events / Recovery / Profile
- **Stack navigation:** Full-screen pushes for sub-screens; modals for WorkoutExecution, AiWorkout, ImportHistory, ChallengeRecording
- **No back button visible on tabs** — correct for native tab pattern
- **Linking:** Deep-link support (`mrtraining://`, `exp://`, `https://mobile.innotechlabssas.lat`)

### 6.5 Mobile — Forms

- React Hook Form + Zod for all form validation
- Custom `Input` component from shared UI
- Numeric inputs: `keyboardType="numeric"` properly set (visible in RecoveryScreen, WeightInput)
- Accessibility: `accessibilityRole`, `accessibilityState`, `accessibilityLabel` on interactive elements
- Touch targets: `minHeight: 44` / `minWidth: 44` consistently enforced on Pressables

### 6.6 Mobile — Data / UX States

- Loading: `EmptyState variant="loading"` → renders `Skeleton.Screen` (shimmer) — never perpetual spinner
- Error: `EmptyState variant="error"` with retry handler
- Empty: `EmptyState variant="empty"` with contextual message
- Offline: `OfflineBanner` component + offline state handling
- Pull-to-refresh: `RefreshControl` with `tintColor={colors.primary}` on all main scroll views
- Pending sync: `PendingSyncBadge` on WorkoutExecution for offline-logged sets

### 6.7 Mobile — Workout Execution Flow

The workout execution experience is complete:
```
WorkoutDetail → WorkoutExecutionScreen
  ProgressBar (top) → ExerciseCard (name, prescription, set counter)
  → [FormAnalyzer (AI) | RepCounter | WeightInput | SetInput | RIR]
  → PrimaryButton (log set / next exercise)
  → RestOverlay (full-screen countdown, skippable)
  → UpNextPreview (next 1-2 exercises)
  → CompletionSummary (duration, stats, PRs, badges)
```

---

## 7. Identified Problems

### 7.1 CRITICAL — Landing Page Does Not Exist

**Evidence:** `apps/web/src/app/(marketing)/page.tsx` is a minimal stub:
```tsx
<h1 className="text-5xl md:text-7xl font-display font-bold">MR Training</h1>
<p>{t('landing.description')}</p>
// Three feature cards with emoji icons (🤖, 📊, 👥)
// Two CTAs: Sign In + Get Started
```
**Problem:** A product of this complexity and quality has no public face. There is no:
- Hero with value proposition
- Product screenshot / demo
- Social proof / testimonials
- Feature breakdown
- Pricing section
- Conversion storytelling
- Any fitness positioning

**Impact:** No customer acquisition funnel. New coaches cannot understand what MR Training does.

### 7.2 HIGH — Emoji Icons in Landing (violates brand rules)

**Evidence:** Landing uses `🤖`, `📊`, `👥` as feature card icons.  
**Rule violated:** `apps/rules/mobile-rules/01-mobile-ui-ux.md` — "Sin emojis como iconos".  
**Note:** This applies to mobile, but the brand guidelines also require SVG icons throughout. Emoji are inconsistent with the premium brand identity.

### 7.3 HIGH — Typography Token Divergence (web ≠ spec ≠ mobile)

**Evidence:**
- `tailwind.config.ts` sets `font-display: 'Montserrat'`
- `rules/02-design-system.md §1.2` specifies `--font-display: 'Archivo'`
- Mobile uses `Inter_800ExtraBold` as display weight (no dedicated display typeface)

**Impact:** The product has three different display type personalities across surfaces. Montserrat (geometric, clean) vs Archivo (grotesque, sporty) create different brand impressions. Neither aligns with the spec.

### 7.4 HIGH — Semantic Color Mismatch Across Surfaces

| Color | Web CSS | Mobile tokens | Design system spec |
|-------|---------|---------------|--------------------|
| Error | `#FF3D00` | `#FF6B6B` | `#FF5A5F` |
| Success | `#00C853` | `#34D399` | `#34D399` |
| Warning | `#FFB300` | `#FBBF24` | `#FBBF24` |

**Impact:** Users who move between the web dashboard and mobile app see different visual signals for the same semantic states (error = orange-red on web, salmon on mobile).

### 7.5 HIGH — Sign-In Page Shows "Coach" Role Only

**Evidence:** `apps/web/src/app/(auth)/sign-in/page.tsx`
```tsx
const ROLES = [
  { id: 'coach', label: 'Coach', icon: ClipboardList, desc: 'Manage athletes & create programs' },
];
// No athlete role
```
**Problem:** The web app is intended as both a landing/marketing surface and the Coach Platform. Athletes using web have no sign-in entry point. This is either intentional (web is coach-only) or a gap. If intentional, the landing page should be explicit that athletes use the mobile app.

### 7.6 HIGH — Web Has No Formal Shared Component Library

**Evidence:** `apps/web/src/components/ui/` contains only `card.tsx` and `logo.tsx`. All other components are scattered inside `features/coach/components/`. The landing page, auth flows, and coach platform share almost no UI primitives.

**Impact:**
- Buttons are ad-hoc in each component (no `<Button>` primitive — just raw `<button>` with inline class strings)
- No shared Input, Select, Modal, Badge, Toast system across web
- Coach-specific `EmptyState` is defined inside the coach feature — not reusable for auth or nutrition pages
- Every new page reinvents layout and spacing

### 7.7 MEDIUM — GlassDock Border Color Bug

**Evidence:** `GlassDock.tsx` line:
```tsx
borderTopColor: 'rgba(200,255,0,0.08)',
```
This is Volt green (`#C8FF00` @ 8% opacity), which was **retired** per `rules/01-brand-guidelines.md` (2026 update). The border should use `colors.border` (`#242B28`) or `colors.primary` faint variant.

### 7.8 MEDIUM — ActivityRings Uses Hardcoded Colors

**Evidence:** `ActivityRings.tsx`:
```tsx
const MOVE_COLOR = '#15AAF2';      // OK — matches tokens.colors.primary
const EXERCISE_COLOR = '#34D399';  // OK — matches tokens.colors.success
const RECOVERY_COLOR = '#3B9EFF';  // Matches tokens.colors.secondary
```
The `#3B9EFF` is correct per tokens.secondary, but it's hardcoded instead of imported from tokens. A future token update would not propagate.

### 7.9 MEDIUM — RecoveryScreen Uses Non-Token Inline Styles

**Evidence:** `RecoveryScreen.tsx`:
```tsx
eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: colors.primary }
title: { fontSize: 28, fontWeight: '700', lineHeight: 34, marginBottom: spacing.lg }
sectionEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 }
```
These font sizes (28px, 11px) don't map to any named `typography.*` token. `titleText` (28px) and the eyebrow (11px) are defined ad-hoc, bypassing the token system.

### 7.10 MEDIUM — Dashboard Has Mixed Color Hardcoding

**Evidence:** `CoachDashboard.tsx` uses `bg-emerald-500/15 text-emerald-400`, `bg-blue-500/15 text-blue-400`, `bg-orange-500/15 text-orange-400`, `bg-purple-500/20 text-purple-400`, `bg-amber-500/20 text-amber-400` extensively.

The `tailwind.config.ts` remaps `orange`, `blue`, `sky`, `cyan`, `indigo`, `purple`, `violet`, `fuchsia`, `pink`, `teal` ALL to the BRAND_SCALE (the MR Blue scale). So `bg-orange-500` renders MR Blue, not orange. But `bg-emerald-500`, `bg-amber-500`, `bg-red-500` are NOT remapped — they use Tailwind's default orange/amber/red. The dashboard ends up with a riot of different accent colors (emerald, amber, red, purple, sky-blue) because the Tailwind remapping only covers some color families.

**Impact:** The dashboard visually looks "busy" with 5+ accent colors per page — contradicting the brand's "one accent" principle.

### 7.11 MEDIUM — Missing Tablet Responsive Design

**Evidence:** Web layouts use `sm:` and `lg:` breakpoints but no `md:` breakpoints for the 768–1024px tablet range. The coach dashboard grid goes from 1-col (mobile) directly to 4-col (xl) — the tablet range (768–1024px) collapses to 2-col on some metrics and 1-col on others with no consistent tablet-optimized layout.

### 7.12 LOW — Auth Shell Uses Wrong Gradient Reference

**Evidence:** `AuthShell.tsx`:
```tsx
<div className="fixed inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top,_#FF6B00,_transparent_70%)]" />
```
`#FF6B00` is an orange not in the design system. This is a remnant of the old dual-accent system (Electric Orange). Should use `#15AAF2` (MR Blue) or `transparent`.

### 7.13 LOW — Web auth sign-in has hardcoded English desc in role selector

**Evidence:**
```tsx
{ id: 'coach', label: 'Coach', desc: 'Manage athletes & create programs' }
```
This string is not internationalized (no `useTranslations` call for this text). All other text in the component uses `t()`.

### 7.14 LOW — Mobile WelcomeScreen uses "MR" text as icon instead of actual logo

**Evidence:** `WelcomeScreen.tsx`:
```tsx
<View style={styles.iconCircle}>
  <Text style={styles.iconText}>MR</Text>
</View>
```
The web sidebar uses `<img src="/images/icon/icon_mr_rp.png">`. Mobile should use the same logo asset (available via `expo-image`) instead of a text monogram for brand consistency.

---

## 8. Identified Strengths

### 8.1 Mobile Design System Discipline

The mobile token system (`tokens.ts`) is comprehensive, well-organized, and consistently consumed. `colors`, `typography`, `spacing`, `radius`, `shadows`, `layout`, `skeleton` are all defined. Component files import directly from tokens — no ad-hoc hex codes in 95% of mobile components.

### 8.2 Mobile Workout Execution UX

The workout execution flow (`WorkoutExecutionScreen`) is mature and covers the full athlete journey: live exercise display, AI form analysis, rep counting, weight input, RIR tracking, offline sync badges, rest timer overlay, demo video modal, up-next preview, and completion summary with PR celebration. This is production-quality fitness UX.

### 8.3 GlassDock Navigation Component

The custom `GlassDock` is a strong design decision — frosted-glass aesthetic, SVG icon system, proper tab press semantics (`accessibilityRole="tab"`), hit slop, focused state using `surfaceRaised` background (not color blob). Clean and native-feeling.

### 8.4 ContinueWorkoutCard — "Training-First" Design Principle

The Today screen correctly surfaces the workout as the dominant action, following the Fitbod/NTC model: the primary CTA is the next workout, not a metrics dashboard. The `ContinueWorkoutCard` uses the primary brand color as background with glow shadow to command attention.

### 8.5 Coach Dashboard — Real Data Density

The `CoachDashboard` is genuinely action-oriented: animated metric cards with count-up numbers, revenue trend charts, goals with progress bars, athlete readiness flags, plan distribution, sales charts, upcoming events. It answers the coach's key daily questions from one screen.

### 8.6 Accessible State Handling

Both surfaces implement the required loading/empty/error/offline states consistently. Mobile's `EmptyState` renders skeletons (never perpetual spinners). Web's coach components have skeletonRows with framer-motion pulse. Pull-to-refresh is on all main mobile scroll views.

### 8.7 Internationalization

Both surfaces support multiple locales:  
- Web: `next-intl`, locales: `es, es-AR, es-ES, es-MX, en, en-US, en-GB`  
- Mobile: `i18next`, same locale set  
Consistent text is managed via a shared locale structure.

### 8.8 Coach "Today" Block System

The time-block architecture for the coach's day (`morning-brief → check-in → session-prep → live-session → mid-day → program-design → communication → insights → daily-summary → evening-recap`) is a strong UX concept — it gives the coach a structured daily workflow that adapts to their schedule.

### 8.9 Server-Side Prefetch on Dashboard

The coach dashboard uses `HydrationBoundary` + server-component prefetch for all five hot queries. This eliminates loading waterfalls — the page renders with data on first byte. Good technical execution.

### 8.10 Mobile Offline Architecture

`PendingSyncBadge`, `OfflineBanner`, offline-aware API client (`smartClient`), `expo-task-manager`, and `@react-native-community/netinfo` integration indicate a thought-through offline-first posture for workout logging.

---

## 9. Technical Constraints for Redesign

### 9.1 Design System Token Update Required

Any redesign must update:
1. `apps/mobile/src/shared/theme/tokens.ts` (canonical source for mobile)
2. `apps/web/src/app/globals.css` (CSS custom properties)
3. `apps/web/tailwind.config.ts` (Tailwind design tokens)
4. `apps/rules/01-brand-guidelines.md` + `02-design-system.md` (docs)

These must stay in sync. The canonical spec is the `rules/` documents.

### 9.2 Font Loading (Mobile)

Mobile fonts load via `@expo-google-fonts/inter`. Switching the display typeface requires adding a new `@expo-google-fonts` package (e.g., `@expo-google-fonts/archivo` or `@expo-google-fonts/montserrat`) and rebuilding the font map in `fontFamilies`.

### 9.3 Font Loading (Web)

Web fonts are loaded via CSS `@import` or Next.js `next/font`. Currently Montserrat and Inter appear to be loaded as CSS imports in `globals.css` or from Vercel's font service. Adding/changing fonts requires updating `globals.css` and `tailwind.config.ts`.

### 9.4 Tailwind Color Remapping Has Side Effects

The current `tailwind.config.ts` remaps ALL of `orange, blue, sky, cyan, indigo, purple, violet, fuchsia, pink, teal` to the MR Blue scale. This means:
- `bg-orange-500` = MR Blue (surprise — not orange)
- `bg-emerald-500` = actual emerald (not remapped)
- `bg-amber-500` = actual amber (not remapped)
- `bg-red-500` = actual red (not remapped)

Any UI work on web must be aware of this or it will produce unexpected colors. This remapping should be revisited as part of the design system overhaul.

### 9.5 Mobile is Athlete-Only

Per `apps/mobile/AGENTS.md`: "Mobile es athlete-only (decisión de producto 2026-10): no construir CoachTabs." The Coach experience is web-only. No native Coach screens should be added to the mobile app.

### 9.6 API Contract Coordination

The mobile app and web both consume `apps/api` exclusively. Any new data needs (e.g., new fields for redesigned screens) require Go API changes coordinated across all three teams.

### 9.7 Clerk Auth

Both surfaces use Clerk for auth. Style customization of Clerk-rendered UI (sign-in/sign-up forms) is limited to Clerk's appearance API. The actual form inputs inside `<SignIn>` components cannot be freely restyled with Tailwind.

### 9.8 CKEditor 5 in Blog

The blog editor uses CKEditor 5 Classic build. Styling is constrained by CKEditor's CSS, which uses `RichTextEditor.module.css` for any overrides. This is a constraint for blog editor UI redesign.

### 9.9 Leaflet Maps

Route map editor uses Leaflet/React Leaflet. Dark mode requires a different tile layer URL. Currently on default OSM tiles.

### 9.10 React Native Reanimated

Animation work on mobile must use Reanimated 4.1.x. Shared element transitions between screens require Reanimated's `useSharedValue` / `SharedTransition` API. Standard `Animated` API from React Native should not be mixed.

---

## 10. Recommended Audit Priority Order

The following order is based on user-facing impact, dependency chain, and implementation risk.

### Priority 1 — CRITICAL (Do First)

1. **Landing Page Full Design & Build**  
   The product has no public face. Design and build a full marketing landing page under `(marketing)/page.tsx`. This is the highest impact for the business. Must answer: what is MR Training, for whom, what problem does it solve, why is it different, how does it work, pricing, testimonials, CTA.

2. **Web Design Token Normalization**  
   Unify `globals.css` + `tailwind.config.ts` semantic colors to match `rules/02-design-system.md`. Fix error (`#FF3D00` → `#FF5A5F`), success (`#00C853` → `#34D399`), align display font (choose: Montserrat, Archivo, or keep Inter). Remove the blanket Tailwind color remapping and replace with explicit `brand.*` tokens only.

3. **Display Font Decision**  
   Choose ONE display typeface and apply across all surfaces. Recommendation: **Montserrat** (already loaded on web, strong geometric-sporty fitness feel, available on Google Fonts) + document in `rules/02-design-system.md`. Mobile: add `@expo-google-fonts/montserrat` and use for `display, h1, h2` typography tokens.

### Priority 2 — HIGH

4. **Web Shared Component Library**  
   Build a minimal `components/ui/` set: `Button`, `Input`, `Select`, `Badge`, `Modal`, `Toast`, `Card`, `EmptyState`, `Skeleton`, `Spinner`. Currently each coach sub-page reinvents these. This unblocks consistent UI improvement across all web pages.

5. **GlassDock Volt Color Fix**  
   Replace `rgba(200,255,0,0.08)` with `colors.border` or `rgba(255,255,255,0.06)`. One-line fix but it removes the last Volt reference from the live codebase.

6. **Coach Dashboard Color Discipline**  
   Audit `CoachDashboard.tsx` and replace the multi-accent pattern (`emerald, amber, purple, red, sky`) with a semantically consistent system: success states → success token, warning states → warning token, primary actions → brand.primary. Apply the 90/10 rule.

7. **Auth Shell Gradient Fix**  
   Replace `#FF6B00` in AuthShell radial gradient with transparent or `var(--color-brand-primary)`.

### Priority 3 — MEDIUM

8. **RecoveryScreen Token Compliance**  
   Replace inline `fontSize: 28` and `fontSize: 11` with `typography.h2` and `typography.caption` from tokens. Minor but enforces the token discipline already established elsewhere.

9. **ActivityRings Token Import**  
   Import `colors.primary`, `colors.success`, `colors.secondary` from tokens instead of hardcoded hex in `ActivityRings.tsx`.

10. **WelcomeScreen Logo**  
    Replace the "MR" text monogram with the actual logo image (`assets/icon.png` or equivalent) using `expo-image`. Matches the web sidebar logo.

11. **Web Tablet Responsive Polish**  
    Add `md:` breakpoint classes to coach dashboard grid layouts for the 768–1024px range.

12. **i18n for Sign-In Role Description**  
    Move `'Manage athletes & create programs'` to the translation file.

### Priority 4 — ENHANCEMENT (After Core is Solid)

13. **Mobile Progress Screen — Full Design**  
    The `ProgressScreen` needs richer visualization: exercise history charts, body weight trend, personal records timeline. Currently it delegates to `ProgressSummary` + video analytics stubs.

14. **Coach Today Block UX Polish**  
    The time-block system is a strong concept but needs visual treatment: block transitions, progress indicators for completed blocks, clearer "current block" emphasis.

15. **Mobile Onboarding Flow Enhancement**  
    `OnboardingSlidersScreen` and `WelcomeScreen` are functional but can be elevated with motion design (Reanimated), actual photo/video backgrounds tied to the platform's fitness identity, and a sharper value proposition.

16. **Nutrition Module Design**  
    Both web (`/(app)/nutrition/`) and mobile (`features/nutrition/`) are built but not audited in depth. These need UX review for meal plans, recipes, and shopping lists.

17. **Coach Athletes Page UX**  
    `/coach/users` is athlete list with flags. Needs deeper evaluation for search, filter, sorting, bulk actions, and athlete profile depth.

---

## Appendix: File Reference Index

| Surface | File | Purpose |
|---------|------|---------|
| Mobile tokens | `apps/mobile/src/shared/theme/tokens.ts` | Canonical token source |
| Mobile nav | `apps/mobile/src/navigation/Navigation.tsx` | Full navigation tree |
| Mobile tabs | `apps/mobile/src/navigation/AthleteTabs.tsx` | Bottom tab definition |
| Web Tailwind | `apps/web/tailwind.config.ts` | Web design tokens |
| Web CSS vars | `apps/web/src/app/globals.css` | CSS custom properties |
| Web layout | `apps/web/src/features/coach/components/layout/CoachLayout.tsx` | Root layout |
| Web sidebar | `apps/web/src/features/coach/components/layout/CoachSidebar.tsx` | Navigation |
| Web topbar | `apps/web/src/features/coach/components/layout/TopBar.tsx` | Top header |
| Web dashboard | `apps/web/src/features/coach/components/dashboard/CoachDashboard.tsx` | Main dashboard |
| Landing | `apps/web/src/app/(marketing)/page.tsx` | Stub landing |
| Brand rules | `apps/rules/01-brand-guidelines.md` | Brand spec |
| Design system | `apps/rules/02-design-system.md` | Design tokens spec |
| Icons | `apps/mobile/src/shared/components/icons/index.tsx` | Mobile icon library |
