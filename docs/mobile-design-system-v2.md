# MR Training — Mobile Design System v2

**Status:** Approved spec · **Owner:** Mobile UX/UI (AthletePro redesign)
**Scope:** Full UX/UI redesign of the React Native (Expo 54, RN 0.81) athlete app (~30 screens).
**Canonical tokens:** `apps/mobile/src/shared/theme/tokens.ts`
**Rules:** `apps/rules/01-brand-guidelines.md`, `apps/rules/02-design-system.md`, `apps/rules/mobile-rules/01-mobile-ui-ux.md`

> **Language note:** UI copy for this redesign is **Spanish** (neutral, professional — not Rioplatense).
> English may be reintroduced later via the i18n module (see §6). This document itself is written in English.

---

## 0. Locked decisions (do not revisit)

| # | Decision |
|---|---|
| 1 | **Accent:** keep Electric Green `#16E37A` (already in `tokens.ts`). **No third accent.** Brand Volt `#C8FF00` is set aside. The leaking `#00A6FB` in `RunningRouteView.tsx` must be removed. Secondary data-viz uses existing `secondary #3B9EFF` **only** and sparingly. |
| 2 | **Language:** UI in Spanish, coherent and consistent (fixing the current EN/ES/Rioplatense mix). Neutral professional ES. |
| 3 | **Data:** **No mock data.** Remove `Math.random()`, `MOCK_MEALS`, and invented values. Use honest empty/skeleton states until backend data arrives. |

> ⚠️ **Divergence already on record:** `tokens.ts` is the canonical, written source and uses Electric Green `#16E37A`. `01-brand-guidelines.md §4` still lists Volt — these will be reconciled separately (out of scope here). This spec does NOT freeze a new accent; it freezes **Electric Green as the single accent for the v2 rollout.**

---

## 1. Design Principles

### 1.1 Dark-first, calm surfaces

The app is a performance tool for athletes, not a game. Depth comes from **tonal layering of neutral surfaces** (`base → surface → surfaceRaised → border`), not from colored elements or heavy borders. ≥ 90% of any screen is neutral; **≤ 10% is accent**. The resting UI is calm and dark; the eye is drawn to exactly the places the athlete must act or read.

### 1.2 Data-first honesty (no fabricated values)

Metrics are the product. **We never invent numbers.** Where the backend has not delivered data, the UI shows a real **skeleton**, an **empty state**, or an **error state** — never `Math.random()` fills, placeholder tracks, or "mock" meals. A screen that shows a fabricated number has lost trust; a screen that shows "Sin datos" with a clear next step has kept it.

### 1.3 Single-accent discipline

Electric Green is the only hue used for emphasis: one primary CTA per screen, active/selected indicators, focus rings, achieved-progress fills. Semantic colors (`success / warning / error`) exist **only** for state communication and are **always paired with an icon or label** — color is reinforcement, never the sole channel. Secondary data-viz blue (`#3B9EFF`) is reserved for spare macro/trend comparison only, never decoration.

### 1.4 Strength through typography (big display numbers)

Metrics are communicated with **BIG display numerals** — Inter ExtraBold (`fontFamilies.displayBlack`), tight tracking, `textTransform` reserved for labels. The number is the hero of every metric card; the label is a quiet overline above it. A single dramatic metric dominates, surrounded by whitespace. This is the "scoreboard" aesthetic: readable at a glance, unambiguous, powerful.

### 1.5 Motion hierarchy

Motion is information, not decoration. Micro-interactions (press feedback, toggle, focus) use 150ms; content reveals use 250–350ms ease-out; page transitions and modal open/close use 350ms; every metric fill animates 0→target over `--duration` (350–800ms) on load. **`prefers-reduced-motion` is always respected** — static skeletons, no decorative parallax. Animation guides attention and confirms state; nothing moves without a reason.

### 1.6 Calm surface, one vivid CTA

One screen = one heroic action. The Electric Green `PrimaryButton` is the highest-contrast element on the screen and **the only vivid CTA**. Secondary/tertiary actions are ghost/outline/neutral text. If a view needs two "primary" actions, the lower-priority is downgraded.

---

## 2. Tokens — additions and refinements

The existing `tokens.ts` is the base and stays canonical. The following are **additions / refinements** (no existing token is deleted or recolored in v2).

### 2.1 Icon color default policy

Today `HomeIcon`, `BarbellIcon`, `HeartPulseIcon`, `CalendarIcon`, `UserIcon`, `StoreIcon`, `MembershipIcon`, `PlusIcon`, `PlayIcon` default to `colors.primary`, while `SearchIcon` and `BellIcon` default to `colors.textSecondary` — a **mixed, inconsistent default**.

**Refinement (v2):** every stroke icon defaults to **`colors.textSecondary`**. Callers explicitly override to `colors.primary` / `colors.text` / semantic colors when context requires (active tab, primary action, error icon). This produces a calm, consistent resting state; accent color becomes an intentional, explicit choice.

**Mechanics:** change the default in each icon's props from `color = colors.primary` to `color = colors.textSecondary`. Add a shared `ICON` helper or a `DefaultColor` re-export in `icons/index.tsx` so the policy is stated once.

### 2.2 Typography display scale for metric numbers

Add a **metric number scale** (used by `MetricCard`, `StatGrid`, ProgressScreen headline). Inter ExtraBold (800), tight tracking, `fontVariant: ['tabular-nums']`.

| Token | fontSize | lineHeight | letterSpacing | Use |
|---|---|---|---|---|
| `metricXL` | 56 | 56 | -0.03 | Hero metric (e.g., training load, readiness score) |
| `metricLG` | 44 | 44 | -0.025 | Primary metric on a card |
| `metricMD` | 32 | 32 | -0.02 | Secondary metric, side-by-side stats |
| `metricSM` | 24 | 28 | -0.015 | Inline stat, compact stat tiles |

All use `fontFamilies.displayBlack`. Add these to `typography` in `tokens.ts`. Keep the existing `statsNumber` (36px) as the current implementation that migrates onto `metricLG`/`metricMD`.

### 2.3 Skeleton system tokens

Add skeleton-aesthetic tokens so the Skeleton primitive (see §3) is fully token-driven:

| Token | Value | Use |
|---|---|---|
| `colors.skeletonBase` | `surfaceRaised` (`#1C2320`) | Resting block fill |
| `colors.skeletonHighlight` | `#2A3330` (new, ~8% lighter than base) | Shimmer sweep highlight |
| `skeleton.duration` | 1400 | ms per shimmer cycle |
| `skeleton.radius` | `radius.sm` (8) | Default block corner |

Add a `skeleton` object to `tokens.ts`. The shimmer uses a `Reanimated` linear-gradient-less sweep (a moving highlight overlay) so iOS/Android behave identically. Reduced-motion → static blocks, no sweep.

### 2.4 Enforce touchTarget 48

`layout.touchTarget = 48` already exists but **is unused**. Enforcement (v2): every `Pressable` in the shared kit and every screen uses an actual minimum hit area of **44pt** (Apple HIG floor) with a preferred **48pt**. Concretely:
- Shared interactive components (`PrimaryButton`, `Badge` when `interactive`, icon buttons, `ScreenHeader` back, `DayStrip` chips, `GlassDock` tabs, list rows) use a **48px min hit target** (either `minHeight/minWidth: 48` or `hitSlop` padding to reach 48px).
- `hitSlop={8}` (which the current `GlassDock` uses) must be audited: with a 32px visual icon, 8px slop reaches 48px — verify each case; don't rely on slop alone for large row targets.
- Replace the "36pt everywhere" audit finding with token references, never inline numbers.

### 2.5 Semantic color additions (minimal)

| Token | Value | Use |
|---|---|---|
| `colors.info` | `#3B9EFF` (alias of existing `secondary`) | Info toasts/banners; **sparingly**, data-viz across a trend or macro, not decoration |
| `colors.onPrimaryVariant` | keep `#68D391` | Muted accent text / secondary accent on green |

No new decorative hues. `info` is an **alias**, not a palette expansion — it names the existing `secondary` blue's semantic role so it is used intentionally and only where blue is genuinely needed (e.g., an informational alert, a carbs macro, a comparison series).

### 2.6 Remove dead weight (documented, enacted in Batch 3)

- **Montserrat** font weight is loaded but unreferenced (`fontFamilies` uses Inter throughout). Remove the load from `fonts.ts` and any Montserrat entries. Body/display both render via Inter.
- **`theme/index.ts` + `designTokens.ts` shims**: once all consumers import from `tokens.ts`, delete the shims (per `mobile-redesign-guide.md` note "los consumidores migran en Fase B").

---

## 3. Component Library — v2 behavior

Current shared kit: `Card`, `Badge`, `PrimaryButton`, `EmptyState`, `ProgressBar`, `Input`, `ScreenHeader`, `DayStrip`, `Toast`, `GlassDock` (all in `src/shared/components/ui/`). v2 spec per component + new primitives.

### 3.1 `Card`
- **Keep:** default/elevated/outlined variants; tonal layering + hairline border; `onPress`, `disabled`, `selected`, `pressed` states.
- **Change:** replace the `loading` **spinner overlay** with a **Skeleton inside the card** (shimmer placeholder matching the card's expected rows) — never a spinner over content. Add a `skeleton?: boolean` prop wired to the new `Skeleton` primitive with a `Skeleton.Card` layout.
- Keep `error` (red hairline) and `empty` (reduced opacity) states.
- Enforce 48px min hit area when `onPress` is set.

### 3.2 `Badge` — **fix the 44pt-min-on-non-interactive bug**
- **Problem:** `badge` style hard-codes `minHeight: 44, minWidth: 44` on **every** badge, even non-interactive status pills (10px text label + 44px box = oversized noise; and a plain `View` has no touch interaction to justify 44pt).
- **Fix:** introduce two props:
  - `size?: 'sm' | 'md' | 'lg'` → `sm` 20px, `md` 24px, `lg` 28px (matches rules §3.6). **Non-interactive badges use `sm`/`md`/`lg` pixel heights**, NOT 44px.
  - `interactive?: boolean` → only interactive badges (with `onPress`) get the **44/48px touch target** (via `minHeight/minWidth` + `hitSlop`), keeping visual pill compact while meeting the tap target.
- **Rule:** if `onPress` is set, `interactive` is implied `true`. Non-interactive status pills never grow to 44px.
- Keep tones (`neutral/success/warning/error/primary`), `selected`, `disabled`, `loading` states. Add optional leading `icon?: IconProps` for paired status (check/alert/dot) so color is never the sole signal.

### 3.3 `PrimaryButton`
- **Keep:** sole Electric Green CTA semantics, dark text (`colors.base`) on green (WCAG AA), loading spinner, pressed → `primaryPressed`, disabled.
- **Change:** add `size?: 'md' | 'lg'` (`lg` = 48px default height, `md` = 44px); enforce 48px min height/tap target. Accept optional leading `icon?` (`PlusIcon` for "Agregar", etc.).
- Add `fullWidth?: boolean` (default true for form CTAs; false for inline).
- Keep destructive modifier (error background) only for confirm-screen destructive primaries; normal destructive actions stay ghost/secondary red.

### 3.4 `EmptyState` — add a real **skeleton** variant
- **Problem:** the `loading` variant renders a **spinner** (contrary to mobile-rule §4 "never a full-screen spinner").
- **Fix:** split variants:
  - `variant="empty"` — icon + title + message + optional CTA. **Icon should be an SVG** (from the expanded set, or a dedicated `EmptyCardIcon`), not emoji now that the icon set grows.
  - `variant="error"` — error icon + title + message + **Retry** CTA. Spanish default copy.
  - `variant="skeleton"` → renders the **new `Skeleton` primitive's** layout (`Skeleton.List` / `Skeleton.Screen`) instead of any spinner. Screen headers/leading content show while rows shimmer.
- All default copy becomes Spanish (see §6). `title`/`message` overridable per screen.

### 3.5 `ProgressBar`
- **Keep:** accessible progressbar role; track `surfaceRaised`, fill `primary`, 4px, `radius.full`.
- **Add:** `tone?: 'primary' | 'success' | 'warning' | 'error'` for state fills; `size?: 'sm'|'md'|'lg'` (2/4/8px); optional `showLabel` renders a formatted Spanish label ("68 %", "4/6"). Indeterminate shimmer via Skeleton for unknown durations.
- Fill animates 0→target (350ms) on appear unless reduced-motion.

### 3.6 `Input`
- **Keep:** default/focus/error/disabled/selected states; `surfaceRaised` bg, `border` 1px, `radius.md`, `body` text, 48px minHeight (currently `spacing.lg*2` = 48 — good, keep).
- **Change:** add optional `leadingIcon`/`trailingIcon` (e.g., `SearchIcon` for search fields, a clear `CloseIcon` when filled); all icons SVG, `textSecondary`. Error line pairs with `AlertIcon` + red caption text (state copy Spanish). Add `variant="filled"` (search bar) reusing current styles.

### 3.7 `ScreenHeader` — add optional health metric
- **Fix:** back affordance currently uses a text glyph `‹`; replace with the **`ArrowLeftIcon`** SVG (consistent stroke set). Touch target 48px.
- **Add:** optional `metric?: { label: string; value: string; unit?: string }` rendered to the right of the title as a compact `MetricCard`-lite readout (big number + overline label) — used on Today/Recovery headers for a glanceable readiness/load number without a full card.
- Keep `title`/`subtitle`/`onBack`/`action`; default to Spanish `aria`-labels ("Volver").

### 3.8 `DayStrip`
- **Keep:** horizontal calendar chips, `Hoy` for today, event dots/counts, infinite scroll.
- **Change:** enforce 48px chip tap target (visual chip can stay compact via padding/hitSlop). Localize weekday labels and "Hoy"; accessibility label already partly Spanish — make it fully neutral ES (`"Lunes 12 · 3 eventos"`). Skeleton: a horizontal row of 5–7 shimmer chips while events load.
- Empty/quiet days show the `·` placeholder as today — keep, but ensure counts come from real `eventCount`, never fabricated.

### 3.9 `Toast`
- **Keep:** `success/error/info` variants, top positioning, 3s auto-hide, theme-matched surface.
- **Change:** replace any emoji/text-glyph lead with **SVG status icons** (`CheckIcon`, `AlertIcon`, `InfoIcon`) as leading icons. Since `react-native-toast-message`'s `BaseToast/ErrorToast/InfoToast` default to emoji, provide custom layout with the SVG icons. Info uses `colors.info` (`#3B9EFF`) sparingly; success `success`, error `error`. Copy in Spanish at call sites.
- Add `ToastType` supports `warning` (amber, `WarningIcon`).

### 3.10 `GlassDock` (core tab bar)
- **Keep:** glassy translucent surface, 56px tabs, active Electric Green icon + label, active accessibility `selected`.
- **Change:** the 5 tab labels move to Spanish (Hoy, Plan, Eventos, Recuperación, Perfil) via i18n. Icon defaults stay `textSecondary` at rest → `primary` when focused (with the new uniform icon-color policy). Ensure each tab's touch target reaches 48px (`hitSlop` already 8 → with 56px bar height it's fine; verify).
- Active tab keeps a subtle Electric Green highlight (icon + label color) — the only accent in the dock.

### 3.11 NEW `Skeleton` primitive
Location: `src/shared/components/ui/Skeleton.tsx`. Purpose: replace all spinners-as-loading with layout-mirroring shimmer.

- `Skeleton.Block({ width, height, radius })` — base rounded block, `surfaceRaised` fill + shimmer highlight.
- `Skeleton.Text({ width, lines })` / `Skeleton.Circle({ size })`.
- Composed layouts (mirror final content exactly, per rule §3.12):
  - `Skeleton.List({ rows })` — ListCard rows.
  - `Skeleton.Screen()` — header + metric + list (full-screen loading).
  - `Skeleton.Grid({ cols })` — MetricCard grid.
  - `Skeleton.DayStrip()` — horizontal chips.
- Shimmer via `Reanimated` 1.4s loop; reduced-motion → static.
- **Adoption rule:** any screen that currently shows a spinner during fetch must show a matching `Skeleton.*` layout instead.

### 3.12 NEW `MetricCard`
Location: `src/shared/components/ui/MetricCard.tsx`. The big-number display unit (rules §5.1 + brand §9 metric cards).

```
+--------------------------------------+
| LABEL (overline, textSecondary)      |  optional SparkIcon / trend
|                                      |
|  128.4                              |  metricLG/XL, displayBlack, tabular-nums
|  kg                                  |  unit, bodySmall, textSecondary
+--------------------------------------+
```

- Props: `label`, `value`, `unit?`, `tone?` (number color default `text`; success/warning/error for state), `icon?`, `trend?` (`{ delta, label }` up/down/flat, each paired with arrow SVG + semantic color).
- Default tone for the **value is `colors.text`** (white) — big numbers are white; accent stays in label underline/icon/trends. Never color a healthy metric green "just because" — green + a check only when it denotes achievement.
- Uses `Skeleton.Text`/`Skeleton.Grid` while loading; `value = null` renders an em-dash `—` or skeleton, **never a fabricated number**.
- Elevation: `surface` bg, hairline, `radius.lg`, padding `md`. Grid-friendly.

### 3.13 NEW `SectionHeader`
Location: `src/shared/components/ui/SectionHeader.tsx`. Standardized section label + optional trailing action.

- `title` (overline or h4), optional `action?: { label: string; onPress }` rendered as a **ghost text button with `ChevronRightIcon`** — used for "Ver todo" everywhere (consistent interaction + 48px target).
- Optional `icon?` before the title (SVG, `textSecondary`).
- `trailing` slot for a small `SegmentedFilter` (see §5).

---

## 4. Icon set (SVG)

Current set: **11** icons — `Home, Barbell, HeartPulse, Calendar, User, Store, Membership, Plus, Play, Search, Bell`. Screens fall back to **emoji** everywhere (audit finding: "only 11 icons → emoji"). v2 grows to **~28** stroke icons with consistent 2px stroke, 24px grid, `Round` caps/joins, matching the existing `index.tsx` style (Svg + Path/Circle/Rect, `fill="none"`).

### 4.1 Required set (~28) mapped to current emoji / usages

| Icon | Exports as | Replaces (emoji/usages) |
|---|---|---|
| Home | `HomeIcon` | (exists) Tab Hoy |
| Barbell | `BarbellIcon` | (exists) Tab Plan, workouts |
| Calendar | `CalendarIcon` | (exists) Tab Eventos |
| HeartPulse | `HeartPulseIcon` | (exists) Tab Recuperación, fitness |
| User | `UserIcon` | (exists) Tab Perfil |
| Bell | `BellIcon` | (exists) 🔔 notifications |
| Search | `SearchIcon` | (exists) 🔍 search fields |
| Plus | `PlusIcon` | (exists) ➕ add |
| Play | `PlayIcon` | (exists) ▶️ video, session |
| Store | `StoreIcon` | (exists) 🛒 store |
| Membership | `MembershipIcon` | (exists) 👑 / 🏅 membership/crown |
| **ArrowLeft** | `ArrowLeftIcon` | `‹` glyph, back navigation |
| **Close** | `CloseIcon` | ✖️ / ✕ dismiss, clear field |
| **Check** | `CheckIcon` | ✅ success, completion |
| **Alert** | `AlertIcon` | 🔴 / ⚠️ error/warning banner (triangle) |
| **Info** | `InfoIcon` | 🔵 / ℹ️ info banner |
| **Warning** | `WarningIcon` | 🟡 warning banner (pair with Alert where distinct) |
| **Bell-off / settings** | `GearIcon` | ⚙️ settings, gear |
| **Star** | `StarIcon` | ⭐ / ♥ favorite (tracks), favorites list |
| **ChartBar** | `ChartBarIcon` | 📊 progress/analytics |
| **TrendUp / TrendDown** | `TrendUpIcon`, `TrendDownIcon` | 📈📉 metric deltas |
| **ChevronRight** | `ChevronRightIcon` | › list-copy chevron, "Ver todo" |
| **ChevronLeft** | `ChevronLeftIcon` | `‹` pagination/local back |
| **Chat** | `ChatIcon` | 💬 community/messages/forum |
| **Filter** | `FilterIcon` | 🌀 filter controls |
| **Share** | `ShareIcon` | ↗ share (store, workouts) |
| **Lock** | `LockIcon` | 🔒 password/locked rows, invites |
| **Logout** | `LogoutIcon` | → destructive exit (paired with red + confirm) |
| **Fire** | `FireIcon` | 🔥 challenge/streak/effort |
| **MapPin** | `MapPinIcon` | 📍 location, route (fixes `#00A6FB` pin color — pin icon now uses primary/textSecondary) |
| **Help** | `HelpIcon` | ❓ help center |
| **Card (credit)** | `CardIcon` | 💳 payments/membership renew |
| **Clock** | `ClockIcon` | ⏱ duration, session length |
| **Target** | `TargetIcon` | 🎯 goals, PR/one-rep-max |

That's **~30** icons (28 additions including the keepers). All `IconProps = { size?: number; color?: string }`, default color `textSecondary` (policy §2.1).

### 4.2 Emoji → icon sweep
After adding the set, run a sweep replacing emoji glyphs used as icons across screens with the matching SVG component (icon list table above is the mapping). Emoji remain **only** in cohort/social noise contexts if any are intentionally retained — better to replace all decorative emoji with SVG or text.

### 4.3 Icon color usage
- Resting/inactive nav, toolbar, secondary actions → `textSecondary`.
- Active nav (focused tab), primary action icons → `primary`.
- Status icons on semantic banners → `success`/`warning`/`error`/`info` (always with the matching label).
- Never use emoji-colored or multi-color icons; single flat color per icon (brand §6).

---

## 5. Pattern Library

Reusable patterns built from the component kit + icon set.

### 5.1 `ListCard`
Standard tappable row/card for lists (settings rows, workouts, events, notifications).
- Anatomy: `[leading icon] [title] [subtitle?] [trailing: ChevronRightIcon | toggle | value]`
- Leading icon in a 40px `surfaceRaised` rounded square, `textSecondary` (or semantic when meaningful).
- 48px+ tap target; `pressed` → `surfaceRaised`. Separated by hairline. `Skeleton.List` while loading; `EmptyState(empty)` when no rows.
- Used across History, Events, Notifications, Settings, Community, Store, Search results.

### 5.2 `SessionListCard`
Workout/session row — extends `ListCard` with progress:
- `[BarbellIcon] [title] [meta: sets·reps·duration] [ProgressBar] [PlayIcon action]`
- Each row shows a real `ProgressBar` from backend; if no progress data, show `—` not a fake 0/partial. English→Spanish labels handled by i18n.

### 5.3 `MetricCard`
As specified in §3.12 — the big-number unit for Progress, Recovery readiness, Today load, Stats.

### 5.4 `AlertBanner`
Replaces emoji `🔴🟡🔵` status banners with a **structured, icon-paired** banner:
- Tones: `success | warning | error | info` (green/amber/red/blue).
- Anatomy: `[AlertIcon|InfoIcon|CheckIcon|WarningIcon] [title] [message]? [action]?`
- **Always paired icon + label** (rule: color is reinforcement). Leading icon + 3px left-border tinted semantic. `surface` bg + hairline. Not interactive; the internal action button (if any) gets 44px.

### 5.5 `SegmentedFilter`
Discrete segmented control (Tabs pill variant, rules §3.9 `pill`): used for Progress period (Semana/Mes/Año), Nutrition macro toggle (Total/Proteinas/Grasas/Carbs), History scope.
- Anatomy: `surfaceRaised` track, `sm`-radius; selected segment `surface` + `text` (or `primary` underline dot); 48px hit target; `accessibilityRole="tablist"`.
- Disabled/loading → Skeleton row of equal segments.

### 5.6 `StatGrid`
2-column (or 2/4) grid of `MetricCard`s for readiness, load, macros, etc. Equal-height row, `gap-md`, `Skeleton.Grid` while loading, `EmptyState` when no data source yet.

### 5.7 `DayStrip` usage
Used on Today / Events as the primary date scrubber:
- Loading → `Skeleton.DayStrip()`.
- Empty (no events any day) → keep strip with `·` quiet markers, show a contextual `EmptyState` *below* the strip, never hide the strip.
- "Hoy" / weekday labels in Spanish; day selects with 48px target.

### 5.8 Per-core-screen state matrix

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Today | `Skeleton.Screen` (header metric + session list + DayStrip) | `EmptyState(empty)` "No hay sesiones para hoy" + CTA "Ver plan" | `EmptyState(error)` + Reintentar |
| Plan/History | `Skeleton.List` | `EmptyState(empty)` "Aún no tenés sesiones programadas" | error + Reintentar |
| Events | `Skeleton.List` + `Skeleton.DayStrip` | `EmptyState(empty)` "No hay eventos programados" | error + Reintentar |
| Recovery | `Skeleton.Grid` (readiness, HRV, sleep) | one `MetricCard` per missing metric with `—` value + hint | error + Reintentar |
| Progress | `Skeleton.Grid` + chart skeleton | "Sin datos aún · Registrá sesiones para ver tu progreso" | error + Reintentar |
| Nutrition | `Skeleton.Grid` (macros) + `Skeleton.List` | "Sin registro de comidas hoy" | error + Reintentar |
| Notifications | `Skeleton.List` | "No tenés notificaciones" | error + Reintentar |
| Community | `Skeleton.List` (forums/challenges) | per-section empty | error + Reintentar |

Rule: **loading = skeleton that mirrors final layout; empty = honest "Sin datos" + path forward; error = retry.** Never fabricate a value or show a perpetual spinner.

---

## 6. i18n ES strategy — pragmatic

Goal: **consistent, neutral professional Spanish** with minimal machinery. No locale framework dependency required for v2.

### 6.1 Module location
`apps/mobile/src/shared/i18n/texts.ts` exporting a typed `texts` object:

```
export const texts = { common: {...}, tabs: {...}, screens: {...} } as const;
```

Usage: `texts.tabs.today`, `texts.common.retry`, etc. — plain imported constants (compile-time, tree-shaken, no provider). A thin `I18nProvider`/fallback can be added in Batch 3 only if a runtime locale is actually needed; for v2 the app is Spanish-only and `texts` is the single source of copy. English becomes an optional second key (`texts.en`) later without restructuring.

### 6.2 Copy table (key strings)

| Key | ES (neutral) | EN (later) |
|---|---|---|
| tabs.today | Hoy | Today |
| tabs.plan | Plan | Plan |
| tabs.events | Eventos | Events |
| tabs.recovery | Recuperación | Recovery |
| tabs.profile | Perfil | Profile |
| common.seeAll | Ver todo | View all |
| common.loading | Cargando… | Loading… |
| common.noData | Sin datos | No data |
| common.retry | Reintentar | Retry |
| common.save | Guardar | Save |
| common.cancel | Cancelar | Cancel |
| common.continue | Continuar | Continue |
| common.logout | Cerrar sesión | Sign out |
| common.back | Volver | Back |
| common.close | Cerrar | Close |
| common.confirm | Confirmar | Confirm |
| common.delete | Eliminar | Delete |
| common.edit | Editar | Edit |
| common.add | Agregar | Add |
| common.today | Hoy | Today |
| common.search | Buscar | Search |
| common.notifications | Notificaciones | Notifications |
| common.settings | Configuración | Settings |
| common.completed | Completado | Completed |
| common.pending | Pendiente | Pending |
| state.errorTitle | Ocurrió un error | Something went wrong |
| state.errorMessage | Revisá tu conexión e intentá de nuevo | Check connection and retry |
| state.emptyTodayTitle | No hay sesiones para hoy | No sessions today |
| state.emptyPlanTitle | Aún no tenés sesiones programadas | No sessions planned yet |
| state.emptyEventsTitle | No hay eventos programados | No events scheduled |
| state.emptyNutritionTitle | Sin registro de comidas hoy | No meals logged today |
| state.emptyProgressTitle | Sin datos todavía | No data yet |

> **Voice rule:** neutral professional ES — imperative, direct, no Rioplatense slang ("tenés" above is a placeholder to be normalized to neutral "tienes" per the locked language decision; decide once in `texts.ts` and use consistently). UI copy is **not** Rio-platense.

### 6.3 Consistency rules
- All copy lives in `texts.ts`; screens import, never inline literals.
- Tenses: imperative for actions, present for states.
- Numbers/dates localized once (e.g., `05/09`, weekday names); units use a fixed separator ("128 kg", "68 %").

---

## 7. Per-screen migration guide

Priorities: **P0** = broken/honesty/trust issues (mock data, fake numbers), **P1** = visual consistency (emoji→icon, 36→44pt, hardcolor→token), **P2** = polish (copy, skeleton coverage, dead weight).

### Core (5 tabs)

| Screen | What to change | Priority |
|---|---|---|
| **TodayScreen** | Add proper skeleton (Skeleton.Screen) + error/empty; DayStrip skeleton; header metric via `ScreenHeader.metric`; ES copy "Hoy" | **P0** |
| **HistoryScreen** (Plan tab) | `Skeleton.List`; empty/error states; `ListCard`/`SessionListCard`; ES copy "Plan" | **P0** |
| **EventsScreen** | `Skeleton.DayStrip` + `Skeleton.List`; `AlertBanner` statuses; ES copy "Eventos" | **P0** |
| **RecoveryScreen** | `MetricCard` readiness/HRV/sleep (big numbers); `Skeleton.Grid`; eliminate any emoji; ES copy "Recuperación" | **P0** |
| **ProfileScreen** | **Replace 6 hardcoded `#FFFFFF` (lines 670–717) with tokens** (`colors.text`/`surfaceRaised`); emoji→icon menu rows (`ListCard`); ES copy "Perfil", "Cerrar sesión" | **P0** |

> The 5-tab labels + GlassDock already exist; Batch 1 makes them Spanish + consistent (see §8).

### Legacy stack (Batch 2)

| Screen | What to change | Priority |
|---|---|---|
| **ProgressScreen** | **Remove `Math.random()` bars (line 46)** → real data or `MetricCard` + skeleton; `SegmentedFilter` (Semana/Mes/Año); `ChartBarIcon`/`TrendUp`; ES copy | **P0** |
| **NutritionScreen** | **Remove `MOCK_MEALS` (lines 25/59)** → API or empty/skeleton; `StatGrid` macros; `AlertBanner`; ES copy "Sin registro de comidas hoy" | **P0** |
| **SettingsScreen** | `ListCard` menu (rows optional sub-screens); `GearIcon`; ES copy "Configuración" | **P1** |
| **NotificationSettingsScreen** | Replace `thumbColor="#FFFFFF"` with token; ES copy | **P1** |
| **SearchScreen** | `SearchIcon`; `ListCard` results; empty/loading states; ES copy "Buscar" | **P1** |
| **CommunityScreen** | `ChatIcon`/`FireIcon`; `ListCard`; empty/error states | **P1** |
| **ArticlesScreen** | `Skeleton.List`; icon/emoji→SVG | **P2** |
| **WeeklyChallengeScreen** | `FireIcon`, remove emoji; real progress or skeleton | **P1** |
| **ChallengeDetailScreen** | `MetricCard` + `FireIcon`; ES copy | **P2** |
| **DiscussionForumScreen** | `ChatIcon`; `ListCard` | **P2** |
| **FavoritesScreen** | `StarIcon`; `ListCard`; skeleton/empty | **P1** |
| **MembershipScreen** | `MembershipIcon`/`CardIcon`; `AlertBanner` (warning expiring); ES else | **P1** |
| **StoreScreen** | `StoreIcon`/`CardIcon`/`ShareIcon`; `ListCard`; skeleton/empty | **P1** |
| **Notebooks / NotificationsScreen** | `BellIcon` + `Skeleton.List` + `EmptyState`; ES copy | **P1** |
| **HelpScreen** | `HelpIcon`; `ListCard` | **P2** |
| **SplashScreen** | Replace `backgroundColor:'#FFFFFF'` (line 174) with token (`colors.base`/`surface`); non-emoji branding | **P1** |
| **OnboardingScreen / OnboardingSlidersScreen** | icon → SVG; target 48pt inputs/buttons; ES copy | **P1** |
| **SignInScreen / InviteAcceptScreen / CoachScheduleModal / WelcomeScreen** | consistent ES copy; SVG icons; token colors | **P1** |
| **WorkoutExecutionScreen / WorkoutDetailScreen / WorkoutListScreen / CreateRoutineScreen / AthleteTodaySummary** | `SessionListCard`/`MetricCard`; icons; ES copy; 48pt targets | **P1** |
| **ImportHistoryScreen** | `Skeleton.List`; ES copy | **P2** |
| **MealDetailScreen** | `MetricCard`; ES copy; no invented values | **P1** |
| **RunningRouteView** | **Remove `pinColor="#00A6FB"` (line 107)** → `MapPinIcon` in `primary`/`textSecondary`; ES copy | **P0** |
| **Splash/Welcome screens** | Verify no emoji logos; use SVG monogram | **P2** |

### Cross-cutting (every screen)
| Item | Change | Priority |
|---|---|---|
| Emoji → SVG icons | use the expanded set (§4) | **P1** |
| Touch target 36→44/48 | use `layout.touchTarget:48` / `hitSlop` | **P1** |
| Hardcoded colors → tokens | audit every literal `#…` | **P1** |
| Mock/fake data → empty/skeleton | remove `Math.random`, `MOCK_*`, invented values | **P0** |
| Mixed EN/ES → ES copy | via `texts.ts` | **P1** |
| Spinner-only loading → skeleton | adopt `Skeleton.*` | **P1** |

---

## 8. Phased rollout (reviewable batches)

Each batch is a self-contained, reviewable unit. Batches keep tests green (`npx tsc --noEmit && npm test`) and are committed with conventional (English) messages.

### Batch 1 — Foundation + core 5 tabs
1. **Tokens (§2):** display metric scale, skeleton tokens, `info` alias, uniform icon-color default.
2. **Icon set (§4):** add the full new SVG set; update existing icons to `textSecondary` default.
3. **Component kit (§3):** `Skeleton`, `MetricCard`, `SectionHeader`, `AlertBanner`, `SegmentedFilter`, `StatGrid`, `ListCard`, `SessionListCard`; fix `Badge` (size/interactive), `EmptyState` skeleton variant, `ProgressBar` variants, `ScreenHeader` icon-back + metric, `Toast` SVG icons, `GlassDock` Spanish labels.
4. **Core tabs (Today, Plan/History, Events, Recovery, Profile):** apply patterns + skeleton/empty/error + Spanish copy.
5. **Fix P0 honesty bugs immediately:** remove `Math.random` (Progress), `MOCK_MEALS` (Nutrition), the 6×`#FFFFFF` (Profile), `#00A6FB` (RunningRouteView), `#FFFFFF` splash.
6. Tests updated for new components; `tsc` clean.

> **Gate:** core 5 tabs fully redesigned, honest, Spanish, token-clean. This is the visible "v2 is real" milestone.

### Batch 2 — Legacy stack screens
- Convert the legacy skeleton screens (Progress, Nutrition, Settings, NotificationSettings, Search, Community, Articles, Challenges, Forum, Favorites, Membership, Store, Notifications, Help, Splash, Onboarding, SignIn, invitación, Workout flow, MealDetail, RunningRouteView) per the §7 table.
- Priority-order within batch: **P0 honesty fixes first** (already green-lit in Batch 1 where they touch core), then P1 visual consistency, then P2 polish.
- Every edited screen: icon sweep + 48pt + token colors + ES copy + skeleton/empty/error.

> **Gate:** no screen uses emoji-as-icon, hardcoded color, mock data, or a public-facing spinner-only loading.

### Batch 3 — i18n + skeleton rollout + final polish + dead-code removal
1. **`texts.ts` i18n module (§6):** migrate all remaining inline literals to `texts`; Centralized copy lint (no raw ES/EN strings in screens).
2. **Skeleton full rollout:** confirm every fetch path uses `Skeleton.*` not spinner; reduced-motion respected.
3. **Final polish:** align all `ProgressBar` fills to token, ensure exactly one primary CTA per screen, `SectionHeader` "Ver todo" everywhere consistent, motion durations audited.
4. **Dead-code removal (§2.6):** remove unreferenced Montserrat weight load; delete `theme/index.ts` + `designTokens.ts` shims once all consumers import `tokens.ts`; remove any leftover `EmptyIcon`/`ErrorIcon` emoji-based icons replaced by SVG.
5. **Final QA:** full-screen pass on iOS + Android; `tsc`, `npm test`, accessibility (contrast, 48pt, labels).

> **Gate:** entire app (all ~30 screens) dark-first, single-accent Electric Green, honest data, Spanish copy, token-driven, skeleton-backed. `mobile-redesign-guide.md` updated to reflect v2 final state.

---

## 9. Verification

Per `mobile-rules/13-testing.md` and repo `apps/mobile/AGENTS.md`:
```bash
cd apps/mobile && npx tsc --noEmit && npm test
```
- New components ship with unit tests (Skeleton reduced-motion, Badge size/interactive target, ProgressBar tones/label, MetricCard null-value, i18n key presence).
- No mock data assertions anywhere; screens tested for empty/skeleton/error branches.
- Visual QA on low-end device for 60 FPS motion and skeleton shimmer.
