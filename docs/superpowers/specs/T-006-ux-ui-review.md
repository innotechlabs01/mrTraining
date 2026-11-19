# T-006 — Mobile UX/UI Design Review Spec

**Role:** UX/UI Designer (senior product designer, fitness-grade mobile/web)
**Status:** Design review only — no code changes
**File:** `docs/superpowers/specs/T-006-ux-ui-review.md`

---

## 1. Context & Constraints

This is a code-only review. Real-device validation via mobile MCP (Maestro) **could not be performed** because no mobile MCP tool is available in this environment. Per the AGENTS.md global mobile UI validation rule, code-only review is **NOT sufficient** — every mobile screen must be validated on a running Android emulator/device or iOS simulator/device using Maestro before being marked complete.

### Constraints honored
- **Design system:** `apps/mobile/src/shared/theme/tokens.ts` — dark-first, single accent MR Blue `#15AAF2`, touch targets ≥44pt/48pt, spacing scale `{xs:4, sm:8, md:16, lg:24, xl:32, xxl:48, xxxl:64}`, typography scale Inter-based (`display`, `h1-h4`, `body`, `bodySmall`, `caption`, `overline`, `metric*`).
- **Mobile rules:** `00-mobile-architecture.md`, `01-mobile-ui-ux.md`, `02-mobile-code-quality.md`, `05-mobile-performance.md` (60 FPS, FlashList, lazy heavy screens, bundle <5 MB compressed).
- **No emojis as icons** — use `shared/components/icons/` SVGs only.
- **One primary action per screen.** Loading/empty/error states always.
- **API-first:** mobile talks only to Go API (`apps/api`), no Next.js API Routes for data.
- **Reuse existing components** — Card, ListCard, SectionHeader, EmptyState, PrimaryButton, ContinueWorkoutCard, AthleteTodaySummary, SectionHeader, Badge, ProgressBar, ScreenHeader, MetricCard, StatCard, ActivityRings, StreakBadge, BadgeUnlockToast. Do not invent new patterns.

### Sources consulted
`apps/rules/MASTER_PROMPT.md`, `apps/rules/mobile-rules/00-06`, `apps/rules/01-brand-guidelines.md`, `apps/rules/02-design-system.md`, `apps/rules/03-ux-workflows.md`, `apps/mobile/AGENTS.md`, `tokens.ts`, shared components, and 12 representative screens (TodayScreen, ExercisesScreen, SessionFeedbackScreen, RecoveryScreen, WorkoutExecutionScreen, SignInScreen, plus WorkoutList, WorkoutDetail, HistoryScreen, ProfileScreen, NutritionScreen, CommunityScreen, SettingsScreen).

---

## 2. User Flow Per Screen Group

Each group: entry → states → exit. One primary action per screen.

| Screen group | Entry point | Primary action (one per screen) | Exit / next |
|---|---|---|---|
| **Auth** (SignIn, Onboarding, Welcome, Splash) | App launch, no Clerk session | Sign in / complete onboarding | AthleteTabs (Today) |
| **Today** | AthleteTabs → Today tab | Continue today's workout (ContinueWorkoutCard) | WorkoutExecution → SessionFeedback |
| **Training** (WorkoutList, WorkoutDetail, Exercises, History) | Today / bottom tab | Open a workout / exercise detail | WorkoutExecution |
| **WorkoutExecution** | WorkoutDetail → start session | Log sets / complete session | SessionFeedback |
| **SessionFeedback** | WorkoutExecution → post-session | Send RPE + notes to coach | Today |
| **Recovery** | Bottom tab | Log readiness (manual check-in) | Today / Profile |
| **Nutrition** | Bottom tab | Log meal | Today |
| **Progress** | Bottom tab / Today → History | View PRs / trends | WorkoutDetail |
| **Community** (Feed, Challenges, Articles) | Bottom tab | Share post / join challenge | ChallengeDetail / ArticleDetail |
| **Profile / Settings / Membership / Support / Help / Store / Favorites** | Bottom tab / Profile | Edit profile / open ticket / buy plan | Profile |

### Coach ↔ Atleta interaction loop
1. Coach assigns a program/workout (web) → appears in athlete Today.
2. Athlete executes (WorkoutExecution), logs sets, completes session.
3. Athlete sends SessionFeedback (RPE + notes).
4. Coach reviews session (web), sends feedback back via Communications.
5. Athlete receives coach feedback → adjusts next session → loop closes on Today.

The mobile side owns steps 2–4 and the notification surface that tells the athlete "coach has feedback."

---

## 3. Screen Structure & Component Hierarchy

Shared shell used across all screens:

```
SafeAreaView (base background)
  └─ ScrollView | FlashList (content)
       ├─ ScreenHeader / TodayHeader (title, back, actions)
       ├─ [Hero card: ContinueWorkoutCard | ReadinessHero | MetricCard]
       ├─ SectionHeader (title + optional "Ver todo" action)
       ├─ [ListCard rows | FlashList of WorkoutCard | MetricCard grid]
       ├─ EmptyState / ErrorState (variant: loading|empty|error|skeleton)
       └─ PrimaryButton (sticky bottom, fullWidth, one primary action)
```

**Shared component inventory and correct usage:**

| Component | Role | States supported | Tokens |
|---|---|---|---|
| `Card` | Surface container | default/elevated/outlined/premium, loading, error, empty, selected, disabled | `surface`, `border`, `radius.lg`, `shadows.sm` |
| `ListCard` | Tappable list row | default, pressed | `surface`, `border`, `touchTarget=48` |
| `SectionHeader` | Section label + CTA | default | `h3`, `primary` for action label |
| `EmptyState` | Empty / error / loading | empty, error, loading, skeleton | `text`, `textSecondary`, `error`, skeleton radius |
| `PrimaryButton` | One primary action | primary/ghost/outline/subtle, loading, disabled, error | `primary` (bg), `base` (text), `radius.lg`, height 48/56 |
| `ContinueWorkoutCard` | Today hero CTA | default, pressed | `primary` bg glow, `base` text |
| `AthleteTodaySummary` | Readiness hero | loading skeleton → data | `heroMetric`, `metric*`, success/warning/error tones |
| `ScreenHeader` | Page header + back | default | `h2`, `ChevronLeftIcon` |
| `Badge` | Status chip | default/brand/success/warning/error/info | `primarySoft`, `success`, `warning`, `error` |
| `ProgressBar` | Determinate / indeterminate | default/success/warning/error | `primary`, `surfaceRaised` track |
| `MetricCard` | Single value + context | default, tone variants | `metricXL/LG/MD/SM`, `textSecondary` |
| `StatCard` | Stat pair | default | `bodyStrong`, `caption` |
| `ActivityRings` | Readiness rings | default | `success`, `warning`, `error` ring colors |
| `StreakBadge` | Streak pill | active/inactive | `primary`, `textSecondary` |
| `BadgeUnlockToast` | Celebration toast | success | `success`, `CheckIcon` |
| `OfflineBanner` | Connectivity | persistent non-blocking | `warning`, border hairline |
| `Toast` | Transient feedback | success/error/warning/info/loading | semantic colors |
| `Input` | Form field | default/focus/error/disabled | `surfaceRaised`, `border`, `error` |
| `Select` | Dropdown | default/focus/error | `surfaceRaised`, chevron down |

All icons come from `shared/components/icons/index.tsx` (SVG, 2px stroke, 24x24 grid). No emoji icons anywhere.

---

## 4. States: Loading, Empty, Error, Success

Every screen must render exactly one of these at any time:

- **Loading:** `EmptyState variant="loading"` → `Skeleton.Screen` (never a full-screen perpetual spinner). Skeleton mirrors final layout. `RefreshControl` tint `colors.primary` on pull-to-refresh.
- **Empty:** `EmptyState variant="empty"` with illustration icon (InfoIcon 32px `textSecondary`), headline `h3` `text`, message `body` `textSecondary`, optional primary CTA. Never blame the user; always show a path forward.
- **Error:** `EmptyState variant="error"` with AlertIcon 32px `error`, retry action where recoverable, full-screen error with retry button for fatal errors — never a white screen. Inline field errors on forms (red border `error`, helper text `caption` `error`).
- **Success:** inline check (`CheckIcon` `success`), toast `success` (auto-dismiss 5s), optional celebration (`BadgeUnlockToast`) for milestones (PR, streak, session complete).

### Keyboard behavior (forms exist on: SignIn, SessionFeedback, Recovery manual input, Support tickets, Settings forms)
- `KeyboardAvoidingView` with `behavior="padding"` on iOS, `height` on Android.
- `keyboardShouldPersistTaps="handled"` on ScrollView.
- Numeric keypad (`keyboardType="numeric"`, `inputMode="numeric"`) for weight/reps/readiness 1–10.
- Multiline `Input` for notes with `textAlignVertical="top"`.
- Primary button disabled until form valid; shows `ActivityIndicator` while loading (button retains width to prevent layout shift).
- Dismiss keyboard on tap outside (ScrollView tap handling) and on form submit.

---

## 5. Improvable Screens & Recommendations

### High-impact improvable screens

**1. TodayScreen (`training/presentation/screens/TodayScreen.tsx`) — IMPROVABLE**
- *Issues:* Four equal-weight QuickAction items compete with the single primary action (ContinueWorkoutCard). Violates "one primary action per screen." Quick actions use placeholder colored boxes instead of real icons from `shared/components/icons/`. `PRsSection` rendered with `prs={[]}` (hardcoded empty) — dead content. `ChallengeHomeCard challenge={null}` renders an empty challenge card. `RefreshControl` on a `ScrollView` (not FlashList) — mixed list tech. `useFocusEffect` refetches on every focus — can cause redundant fetches.
- *Recommendations:* Demote QuickActions to a secondary row below the fold or collapse into one "Más acciones" overflow. Replace placeholder icon boxes with real SVGs (DumbbellIcon, PlayIcon, ClockIcon, BellIcon). Remove empty PRs/challenge placeholders or gate them behind real data. Use FlashList for the whole scrollable body (60 FPS). Keep refetch on focus but guard with `staleTime` to avoid refetching within the 60s window.
- *Tokens:* `primary` for ContinueWorkoutCard (already correct), `textSecondary` for quick labels, `surfaceRaised` for quick wraps.

**2. ExercisesScreen (`training/presentation/screens/ExercisesScreen.tsx`) — IMPROVABLE**
- *Issues:* Every row uses a generic DumbbellIcon regardless of exercise category/muscle group — no visual differentiation. No category filter chips (only text search). No empty-state distinction between "no results for query" vs "catalog empty." `useMemo(() => setFavoriteIds(...), [...])` is an anti-pattern (useMemo with side effect). Play button opens external Linking — no in-app demo preview.
- *Recommendations:* Add category filter chips (SectionHeader-style pill row) above the list. Differentiate leading icon by category (Dumbbell/Running/Swimming/Cycling/etc. from icons index). Distinguish empty vs no-search-results states. Replace side-effect useMemo with `useEffect`. Keep FlashList (already correct). Consider in-app video modal instead of external Linking for demo.
- *Tokens:* `textSecondary` for subtitle, `primary` for active star/filter, `surfaceRaised` for icon wraps.

**3. SessionFeedbackScreen (`training/presentation/screens/SessionFeedbackScreen.tsx`) — IMPROVABLE**
- *Issues:* POST to Go API feedback endpoint is not wired (local mock only) — coach↔atleta loop is broken. RPE pills are 48×48 (touch target OK) but no visual affordance for "required." Notes field has no character counter or max length. Bottom button is not sticky to the safe area (bottomSpacer hack). No keyboard avoidance on the multiline notes Input.
- *Recommendations:* Wire the POST to Go API when endpoint exists; keep local optimistic persist for offline. Add required-field indicator on RPE. Add character counter on notes. Make PrimaryButton sticky to bottom with safe-area inset. Wrap notes Input in KeyboardAvoidingView. Show success toast + auto-navigate back on submit.
- *Tokens:* `primary` for selected RPE pill (`rpePillSelected`), `textSecondary` for unselected, `error` for validation, `spacing.lg` page padding.

**4. RecoveryScreen (`recovery/presentation/screens/RecoveryScreen.tsx`) — IMPROVABLE**
- *Issues:* Manual readiness Input and save button are in the same row; button disabled state unclear. Recommendation cards use a custom `recAccent` border instead of a shared badge/component pattern. No explicit empty state when `sleepTrend` is empty (section just omitted). Title uses inline styles (`fontSize: 28`) instead of design-system typography.
- *Recommendations:* Align manual check-in as a dedicated card below auto data with clear "guardar" affordance. Replace custom recCard accent with shared `Badge`/`Card` pattern. Add empty state for sleep trend. Use `typography.h2/h3` instead of inline font sizes. Add offline banner when syncing fails.
- *Tokens:* `typography.h2` for title, `primary` for recAccent, `surface` for cards, `success`/`warning`/`error` for readiness tone.

**5. SignInScreen (`auth/presentation/screens/SignInScreen.tsx`) — GOOD (baseline)**
- Keyboard avoidance correct (`KeyboardAvoidingView`, iOS padding / Android height). Session-aware redirect (never keep signed-in user on sign-in). Mode toggle (sign in / sign up / reset). Uses Clerk Expo.
- *Recommendation:* Add inline field errors (currently relies on toasts only). Add loading state on submit button (already passes `loading`). Keep one primary action ("Continuar" / "Crear cuenta").
- *Tokens:* `colors.base` background, `primary` for primary button.

**6. WorkoutExecutionScreen — GOOD (baseline, heavy but justified)**
- Rich execution UI (RepCounter, WeightInput, RestOverlay, FormAnalyzer, UpNextPreview, PendingSyncBadge). PendingSyncBadge handles offline sync — good. GPS tracking for running.
- *Recommendation:* Lazy-load video demo modal (`ExerciseDemoModal`) and camera/AI form analyzer to keep bundle <5 MB. Ensure FlashList for set lists if many sets. Keep 60 FPS via Reanimated worklets (already intended).
- *Tokens:* `primary` for active states, `success` for completed sets, `error` for failed reps.

**7. ProfileScreen / SettingsScreen / MembershipScreen / SupportScreen / HelpScreen / StoreScreen / FavoritesScreen — REVIEW NEEDED**
- Not read in full during this session. Common risks based on pattern: multiple CTAs per screen (violates one-primary-action), missing empty states, inline styles bypassing tokens, no FlashList on long lists (Favorites, Store, Help tickets).
- *Recommendation:* Audit each for one primary action, FlashList on lists >8 items, EmptyState variants, token reuse.

### Navigation & density recommendations
- Bottom tabs (athlete): Today, Training, Nutrition, Recovery, Profile — 5 items max, per design system. Active state in `primary` (#15AAF2), inactive in `textSecondary`.
- Stack navigation: header with back + title only; no more than 2 actions in header. Use `ScreenHeader` with `ChevronLeftIcon`.
- Section density: use `layout.pagePadding` (24) horizontal, `spacing.xl` (32) between major sections, `spacing.md` (16) within sections. Card padding `layout.cardPadding` (16).
- Touch targets: all interactive rows ≥ 48pt (`layout.touchTarget`). Icon buttons minimum 44×44 with hitSlop 8.

### Coach ↔ Atleta loop gaps (mobile side)
- SessionFeedback POST not wired → loop broken at the athlete→coach handoff.
- No in-app surface for coach feedback → athlete never knows coach reviewed their session. Add a "Coach feedback" section on Today/WorkoutDetail when feedback exists (coach sends via Communications API).
- No push/notification badge for new coach feedback → add bell badge on Today header.
- No optimistic sync for feedback when offline → queue in MMKV, replay on reconnect (per offline rule).

---

## 6. Design Tokens to Use (from `tokens.ts`, no invention)

### Colors
| Role | Token | Hex | Usage |
|---|---|---|---|
| Background | `colors.base` / `colors.background` | `#0B0F0E` | Root canvas |
| Surface | `colors.surface` | `#151B19` | Cards, lists |
| Surface raised | `colors.surfaceRaised` | `#1C2320` | Inputs, chips, icon wraps |
| Border | `colors.border` / `colors.outline` | `#242B28` | Hairlines, separators |
| Primary accent | `colors.primary` | `#15AAF2` | One primary CTA per screen, active states, progress |
| Primary pressed | `colors.primaryPressed` | `#0E93D4` | Pressed state |
| Primary soft | `colors.primarySoft` | `#15AAF21A` | Selected tints, chips |
| Primary faint | `colors.primaryFaint` | `#15AAF20F` | Subtle pressed feedback |
| Text | `colors.text` | `#FFFFFF` | Primary text |
| Text secondary | `colors.textSecondary` | `#9CA3AF` | Captions, metadata, placeholders |
| Success | `colors.success` | `#34D399` | Completed, positive |
| Warning | `colors.warning` | `#FBBF24` | Caution, pending |
| Error | `colors.error` | `#FF6B6B` | Errors, destructive |
| Error container | `colors.errorContainer` | `#3A1010` | Error surfaces |
| On primary | `colors.onPrimary` | `#0B0F0E` | Text on blue (AA) |
| Skeleton base/highlight | `colors.skeletonBase` / `colors.skeletonHighlight` | `#1C2320` / `#2A3330` | Loading placeholders |

### Typography
| Token | Size | Weight | Usage |
|---|---|---|---|
| `typography.display` | 34 | 800 | Hero headlines |
| `typography.h1` | 30 | 800 | Page titles |
| `typography.h2` | 24 | 800 | Section headers |
| `typography.h3` | 20 | 700 | Card titles, EmptyState headlines |
| `typography.body` | 16 | 400 | Body copy |
| `typography.bodySmall` | 13 | 400 | Secondary descriptions |
| `typography.caption` | 11 | 500 | Metadata, timestamps, labels |
| `typography.overline` | 10 | 700 | Section labels (uppercase) |
| `typography.label` | 13 | 600 | Button labels |
| `typography.metricXL/LG/MD/SM` | 56/44/32/24 | 800 | Big scoreboard numerals |
| `typography.heroMetric` | 72 | 800 | Readiness score hero |

### Spacing
| Token | Value | Usage |
|---|---|---|
| `spacing.xs` | 4 | Inline gaps |
| `spacing.sm` | 8 | Tight grouping |
| `spacing.md` | 16 | Card padding, section gaps |
| `spacing.lg` | 24 | Page padding (`layout.pagePadding`), major sections |
| `spacing.xl` | 32 | Hero padding, section separation |
| `spacing.xxl` | 48 | Large gaps |
| `spacing.xxxl` | 64 | Maximum |

### Radius / Shadows / Layout
- `radius.sm` 8 (chips, inputs), `radius.md` 12 (buttons), `radius.lg` 16 (cards), `radius.xl` 24 (hero cards), `radius.xxl` 32 (premium), `radius.full` 9999 (avatars, pills, progress).
- `shadows.sm/md/lg/xl` for elevation; `shadows.glow`/`glowStrong` for primary accent glow (ContinueWorkoutCard).
- `layout.pagePadding` 24, `layout.cardPadding` 16, `layout.heroPadding` 32, `layout.touchTarget` 48, `layout.headerHeight` 56.

### Skeleton
- `skeleton.duration` 1400ms, `skeleton.radius` `radius.sm`. Use `Skeleton.Screen` for loading.

---

## 7. Acceptance & Validation Flag

**Observable acceptance:** A design review spec covering flow, states, tokens, improvable screens, and recommendations. No code changes.

**Real-device validation limitation (must be flagged):** Real-device/emulator validation via mobile MCP (Maestro) could not be performed because no mobile MCP tool is available in this environment. Per the AGENTS.md global mobile UI validation rule, code-only review is NOT sufficient. Every improvable screen (TodayScreen, ExercisesScreen, SessionFeedbackScreen, RecoveryScreen, and the unreviewed Profile/Settings/Membership/Support/Help/Store/Favorites screens) must be validated on a running Android emulator/device or iOS simulator/device using Maestro before being marked complete. Validation must cover: screen rendering, navigation, buttons/touch, text inputs, forms, lists/scrolling, loading/empty/error/success states, keyboard behavior, back navigation, dark/light mode, and accessibility (VoiceOver/TalkBack).

**Next steps:** Implement the UX improvements (code task), then run Maestro E2E on each screen against the acceptance criteria above.