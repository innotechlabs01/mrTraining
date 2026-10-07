---
title: "MR Training — Full UX/UI Redesign Specification"
version: "1.0"
date: "2026-01-01"
status: "APPROVED — Developer-Ready"
authors: ["Senior Product Designer", "Design Systems Architect"]
surfaces: ["Next.js 14 Web (Landing + Coach Platform)", "Expo 54 React Native (Athlete Mobile App)"]
---

# MR Training — Full UX/UI Redesign Specification

> **Developer note:** This document is the single source of truth for all UI/UX changes. Every decision below names the exact file, class, token, or prop to change. Read each section fully before starting implementation. When a section says KEEP, make no changes whatsoever.

---

## 1. EXECUTIVE DESIGN REVIEW

### 1.1 Rating by Surface

| Surface | Score | Rationale |
|---|---|---|
| Web Landing | 2 / 10 | Minimal stub: one h1, one paragraph, three emoji feature cards, two links. Answers zero of the seven conversion questions. No navigation, no hero, no pricing, no social proof. |
| Web Coach Platform | 6 / 10 | Solid data density, good SSR prefetch, sensible layout. Broken by multi-accent color chaos, wrong semantic tokens, absent tablet breakpoints, and a retired orange gradient in AuthShell. |
| Mobile Athlete App | 7.5 / 10 | Workout execution flow is production-quality. Token discipline is strong. Gaps: Volt border relic in GlassDock, three inline-style violations in RecoveryScreen, text monogram instead of logo in WelcomeScreen, hardcoded hex colors in ActivityRings. |

### 1.2 Web Landing — Wins and Gaps

**Wins (what exists and is correct):**
- CSS custom properties architecture in globals.css is clean and extensible
- font-display: Montserrat is correctly loaded
- .fire-glow box-shadow is exactly right for brand glow treatment
- .glass-card component class is correct and reusable
- BRAND_SCALE in tailwind.config.ts is a clean single-accent system

**Critical Gaps:**
- Zero sections above the fold answer what is this product or who is it for
- Emoji characters used as feature icons — unprofessional and inaccessible
- No navigation header, no pricing section, no testimonials, no stats
- --color-error: #FF3D00, --color-success: #00C853, --color-warning: #FFB300 all diverge from unified spec
- AuthShell.tsx has a radial-gradient background using #FF6B00 — retired orange accent

**Design Maturity Assessment:**
The landing page is a placeholder, not a product page. A first-time visitor sees the brand name, one sentence, and three emoji tiles — there is no value proposition, no product proof, no pricing, and no reason to sign up. The underlying CSS infrastructure (tokens, tailwind config, glass-card utility) is actually strong; the missing piece is content and section architecture.

### 1.3 Web Coach Platform — Wins and Gaps

**Wins:**
- CoachDashboard.tsx count-up animation via requestAnimationFrame is smooth — keep
- HydrationBoundary SSR prefetch for dashboard query eliminates layout shift
- Sidebar collapsible sections with correct active/hover states
- ProgressBar component uses correct bg-gradient-to-r from-brand-primary/70 to-brand-primary
- DashboardCard entrance animation uses the correct easing [0.22, 1, 0.36, 1]

**Critical Gaps:**
- FORMAT_STYLE record uses bg-emerald-500/15 text-emerald-400, bg-blue-500/15 text-blue-400, bg-orange-500/15 text-orange-400
- MetricCard accent prop strings: bg-emerald-500/20, bg-blue-500/20, bg-purple-500/20, bg-amber-500/20, bg-orange-500/20
- Trend badges: bg-green-500/15 text-green-400 / bg-red-500/15 text-red-400
- Dashboard hero inline streak widget: bg-orange-500/15 p-2 text-orange-400
- Dashboard Quick Actions: text-blue-400 bg-blue-500/10 and text-emerald-400 bg-emerald-500/10
- No md:grid-cols-2 on the 4-metric grid — tablet shows 1-column stack
- AuthShell.tsx gradient references #FF6B00

**Design Maturity Assessment:**
The Coach Platform architecture is genuinely good — information hierarchy is clear, data density is appropriate, and the animation system is well-considered. The main problem is color discipline: the codebase was built before the single-accent rule was firm, so multiple Tailwind color families appear throughout. Because tailwind.config.ts remaps blue/orange/purple/violet to BRAND_SCALE but does NOT remap emerald/amber/green, some colors render as MR Blue while others render as Tailwind defaults — creating an inconsistent multi-accent appearance that undermines the premium identity.

### 1.4 Mobile Athlete App — Wins and Gaps

**Wins:**
- Workout execution flow (WorkoutExecutionScreen + execution components) is complete and production-quality
- tokens.ts architecture: 95%+ of components import from canonical token file
- GlassDock: frosted-glass aesthetic is correct, animation system is solid
- ContinueWorkoutCard: training-first dominant card is exactly right
- ActivityRings: SVG ring implementation is clean

**Critical Gaps:**
- GlassDock.tsx line borderTopColor: rgba(200,255,0,0.08) — retired Volt green relic
- ActivityRings.tsx MOVE_COLOR, EXERCISE_COLOR, RECOVERY_COLOR are hardcoded hex strings
- RecoveryScreen.tsx eyebrow, title, sectionEyebrow styles use raw fontSize/fontWeight numbers instead of typography tokens
- WelcomeScreen.tsx renders MR text as a logo in a circle — must use actual logo image
- tokens.ts colors.error is #FF6B6B — spec canonical value is #FF5A5F

**Design Maturity Assessment:**
The mobile app is the strongest surface. The workout execution UX is a genuine product strength. Token discipline is excellent. The remaining issues are small technical debts: one retired color value, three inline style objects that predate the typography token system, and a text monogram placeholder. These are all quick fixes that should be done before any new feature work.

---

## 2. DESIGN PHILOSOPHY

### 2.1 Five Fitness Design Principles for MR Training

**1. Performance Clarity**
Every number on screen must have context. A metric without trend, goal, or comparison is noise. In the Coach Dashboard, a revenue figure must show the monthly goal progress. In the Mobile App, a set count must show the remaining sets in the exercise. Isolated numbers fail both athletes and coaches.

**2. Friction-Minimal Execution**
The path from open app to first logged set must require zero decisions beyond starting. The Today screen must answer all four questions immediately: what is the workout, how many exercises, what is first, what is the goal. Any tap that is not start or log is friction that reduces workout completion rates.

**3. Single Accent, Full Trust**
MR Blue #15AAF2 is the only accent color. Its presence signals: this is interactive, or this is important. When multiple colors compete for attention (emerald badges, purple icons, amber chips), attention fragments and trust erodes. Semantic colors (success/warning/error) are functional, not decorative.

**4. Dark-First Depth**
The dark background is not a mode — it is the identity. Depth comes from the four-layer surface system (base to surface to surfaceRaised to elevated), not from shadows and gradients. Shadows are used sparingly: only glow on primary CTAs and ContinueWorkoutCard.

**5. Typography as Structure**
Montserrat uppercase drives the athletic energy. It tells the user: this is a serious training product. Inter carries the data: readable, tabular, precise. The two typefaces must never mix within the same visual unit.

### 2.2 What Premium Modern Fitness Means for MR Training

Premium Modern Fitness for MR Training is about precision: the weight felt in a well-set typographic scale, the clarity of a metric card that shows a number, its trend, and its goal in three lines without ambiguity, the confidence of a color system that never confuses accent with status.

Examples of this already in the codebase (to emulate, not change):
- DashboardCard entrance animation: ease: [0.22, 1, 0.36, 1] — fast in, eased settle. Purposeful, not showy.
- ProgressBar gradient: from-brand-primary/70 to-brand-primary — subtle depth on a single-color fill.
- .fire-glow: box-shadow: 0 0 24px rgba(21, 170, 242, 0.45) — single glow, brand color only.
- GlassDock frosted glass: backgroundColor: rgba(11,15,14,0.82) — transparent enough for depth, opaque enough for readability.

### 2.3 What to Avoid — Quoted from Audit

Emoji as icons — from apps/web/src/app/(marketing)/page.tsx:
  icon="🤖", icon="📊", icon="👥"
Replace with Lucide icons. No emoji anywhere in the product.

Retired orange accent — from apps/web/src/features/auth/components/AuthShell.tsx:
  bg-[radial-gradient(ellipse_at_top,_#FF6B00,_transparent_70%)]
#FF6B00 was the old brand accent. Remove this div entirely.

Multi-accent dashboard — from CoachDashboard.tsx MetricCard calls:
  accent="bg-emerald-500/20 text-emerald-400"
  accent="bg-blue-500/20 text-blue-400"
  accent="bg-purple-500/20 text-purple-400"
  accent="bg-amber-500/20 text-amber-400"
All must converge to bg-brand-primary/20 or semantic color tokens.

Retired Volt border — from GlassDock.tsx:
  borderTopColor: rgba(200,255,0,0.08)
Replace with colors.border (#242B28).

### 2.4 Visual Language — Five Adjectives

**Precise:** Every element has an exact position, size, and color value. A padding of 16px is spacing.md in tokens.ts and p-4 in Tailwind.

**Athletic:** Montserrat uppercase headlines and tabular-nums metric displays communicate that this is a tool for people who measure performance.

**Restrained:** The single-accent rule means MR Blue only appears where it earns its place: interactive elements, primary CTAs, active states, live data.

**Legible:** Dark backgrounds, Inter body type, high-contrast text hierarchy (#FFFFFF primary / #9CA3AF secondary / #6B7280 muted). Every piece of data readable at arm's length during a workout.

**Trustworthy:** Consistency across web and mobile — same primary color, same semantic colors, same component behavior — tells users this is a professionally built product.

---

## 3. DESIGN SYSTEM — UNIFIED TOKENS

### 3.1 Font Decision

**FIRM DECISION: Montserrat (display/headings) + Inter (body/data) + JetBrains Mono (code/metrics)**

Brand guidelines §5 explicitly specifies Montserrat Bold as the display typeface, with the TRAINING wordmark rendered in Montserrat Bold 700, establishing it as the structural identity of the brand. The design system spec document rules/02-design-system.md incorrectly references Archivo as the display font — that reference is a documentation error and must be corrected in Phase 1. Montserrat is already loaded in apps/web/src/app/globals.css via @import and declared as fontFamily.display in tailwind.config.ts, confirming it as the correct implementation-ready choice.

Mobile font strategy: Montserrat must be installed via @expo-google-fonts/montserrat and used exclusively for typography.display, typography.h1, and typography.h2 tokens. All other tokens remain on Inter, which is already loaded and optimized for data-dense readability.

#### Web Typography Scale (tailwind.config.ts fontSize — existing values, DO NOT CHANGE)

| Token class | Font | Weight | Size desktop | Size tablet | Size mobile | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|---|
| text-display | Montserrat | 800 | 48px | 40px | 32px | 1.1 | -0.02em |
| text-h1 | Montserrat | 700 | 36px | 30px | 26px | 1.2 | -0.01em |
| text-h2 | Montserrat | 700 | 28px | 24px | 22px | 1.25 | -0.01em |
| text-h3 | Inter | 600 | 22px | 20px | 18px | 1.3 | 0 |
| text-h4 | Inter | 600 | 18px | 17px | 16px | 1.35 | 0 |
| text-body-lg | Inter | 400 | 18px | 18px | 17px | 1.6 | 0 |
| text-body | Inter | 400 | 16px | 16px | 15px | 1.6 | 0 |
| text-body-sm | Inter | 400 | 14px | 14px | 13px | 1.5 | 0.01em |
| text-caption | Inter | 500 | 12px | 12px | 11px | 1.4 | 0.02em |
| text-overline | Inter | 500 | 11px | 11px | 10px | 1.4 | 0.1em |

For display and h1/h2 on landing page, add font-display class to use Montserrat: class="font-display text-display font-extrabold uppercase"

#### Mobile Typography Scale (tokens.ts — changes required after font install)

| Token | fontFamily BEFORE | fontFamily AFTER | fontSize | lineHeight | letterSpacing | textTransform |
|---|---|---|---|---|---|---|
| typography.display | Inter_800ExtraBold | Montserrat_800ExtraBold | 34 | 40 | -0.02 | uppercase |
| typography.h1 | Inter_800ExtraBold | Montserrat_800ExtraBold | 30 | 36 | -0.01 | uppercase |
| typography.h2 | Inter_800ExtraBold | Montserrat_800ExtraBold | 24 | 30 | -0.01 | uppercase |
| typography.h3 | Inter_700Bold | KEEP | 20 | 26 | 0 | — |
| typography.h4 | Inter_700Bold | KEEP | 17 | 22 | 0 | — |
| typography.metricXL | Inter_800ExtraBold | KEEP | 56 | 56 | -0.03 | — |
| typography.metricLG | Inter_800ExtraBold | KEEP | 44 | 44 | -0.025 | — |
| typography.metricMD | Inter_800ExtraBold | KEEP | 32 | 32 | -0.02 | — |
| typography.metricSM | Inter_800ExtraBold | KEEP | 24 | 28 | -0.015 | — |

Metric tokens keep Inter_800ExtraBold — tabular numerics for scoreboards are more legible in Inter than Montserrat.

fontFamilies additions required in tokens.ts after Montserrat install:


### 3.2 Color System — Unified Tokens

#### Three Divergences Resolved

| Semantic | Web globals.css (WRONG) | Mobile tokens.ts (WRONG/CORRECT) | Unified Canonical Value | Authority |
|---|---|---|---|---|
| Error | #FF3D00 | #FF6B6B (WRONG) | **#FF5A5F** | Design spec |
| Success | #00C853 | #34D399 (CORRECT) | **#34D399** | Mobile + spec agree |
| Warning | #FFB300 | #FBBF24 (CORRECT) | **#FBBF24** | Mobile + spec agree |

#### Primary Brand Palette

| Token | Hex | Usage |
|---|---|---|
| brand-primary | #15AAF2 | Interactive elements, active states, primary CTAs, all single-accent uses |
| brand-primary-hover | #0E93D4 | Hover state of brand-primary |
| brand-primary-pressed | #0A7BB3 | Active/pressed state |
| brand-primary-light | #4FC3F7 | Light variant for gradient endpoints |
| brand-ember | #7FD8FF | Tint for gradient text, ember-text utility |
| brand-ember-light | #B3E5FF | Lightest tint |
| brand-secondary | #3B9EFF | Data visualization secondary series, info toasts (sparingly) |

No changes needed to tailwind.config.ts BRAND_SCALE or brand.* colors — they are correct.

#### Background Layers

Both backgrounds are acceptable dark variants — they exist because web and mobile were developed with slightly different dark base values and the visual difference is imperceptible at runtime.

| Layer | Web CSS var | Web Hex | Mobile Token | Mobile Hex | Notes |
|---|---|---|---|---|---|
| Base / Root | --bg | #0A0B0D | colors.base | #0B0F0E | Acceptable 1-step variation |
| Elevated bg | --bg-elevated | #0F0F0F | colors.surface | #151B19 | Web slightly darker |
| Card bg | --bg-card | #141416 | colors.surfaceRaised | #1C2320 | Web slightly darker |
| Border | --border | #1C1C1C | colors.border | #242B28 | Web slightly darker |

Do NOT unify these values — the slight differences are acceptable and changing them risks visual regressions on both surfaces.

#### Web Surface Token Hierarchy (tailwind.config.ts — current, DO NOT CHANGE)

| Tailwind class | CSS var | Dark hex | Usage |
|---|---|---|---|
| bg-surface-0 | var(--bg) | #0A0B0D | Page canvas, deepest background |
| bg-surface-1 | var(--bg-elevated) | #0F0F0F | Sidebar, nav bars, overlays |
| bg-surface-2 | var(--bg-card) | #141416 | Cards, panels, modals |
| bg-surface-3 | var(--border) | #1C1C1C | Hover states, hairlines, subtle dividers |
| bg-surface-4 | var(--border) | #1C1C1C | (alias of 3 — acceptable) |
| bg-surface-5 | var(--border) | #1C1C1C | (alias of 3 — acceptable) |
| bg-surface-6 | #2A2A2C | #2A2A2C | Drag handles, highest-elevated accents |

#### Mobile Surface Token Hierarchy (tokens.ts — DO NOT CHANGE values)

| Token | Hex | RN usage |
|---|---|---|
| colors.base | #0B0F0E | SafeAreaView background, screen root |
| colors.surface | #151B19 | Cards, list items, main content surfaces |
| colors.surfaceRaised | #1C2320 | Elevated rows, inputs, chips, active tab pill |
| colors.border | #242B28 | Hairlines, separators |

#### Text Hierarchy

| Web class | Mobile token | Hex | Usage |
|---|---|---|---|
| text-text-primary / var(--text) | colors.text | #FFFFFF | Primary text — headings, key data |
| text-text-secondary / var(--text-secondary) | colors.textSecondary | #9CA3AF | Secondary text, descriptions |
| text-text-muted / var(--text-muted) | colors.onSurfaceVariant | #6B7280 | Muted labels, timestamps, overlines |

#### Semantic Colors — Unified (Changes required to globals.css and tailwind.config.ts)

**Web: globals.css — .dark block changes:**
```css
--color-success: #34D399;   /* was: #00C853 */
--color-error:   #FF5A5F;   /* was: #FF3D00 */
--color-warning: #FBBF24;   /* was: #FFB300 */
--color-info:    #3B9EFF;   /* new — add this line */
```

**Web: tailwind.config.ts — colors section changes:**
```ts
// REPLACE static hex values with CSS variable references:
success: 'var(--color-success)',   // was: '#00C853'
error:   'var(--color-error)',     // was: '#FF3D00'
warning: 'var(--color-warning)',   // was: '#FFB300'
info:    'var(--color-info)',      // NEW — add this line
```

This change makes success/error/warning respond to dark/light mode via CSS variables instead of being hardcoded static values.

**Mobile: tokens.ts — one change required:**
```ts
colors.error: '#FF5A5F',  // was: '#FF6B6B'
```
All other mobile semantic tokens are already correct (success: #34D399, warning: #FBBF24).

#### Data Visualization Colors (5 chart series — MR Blue scale + semantics only)

| Series | Color | Source |
|---|---|---|
| Primary series | #15AAF2 | colors.primary |
| Secondary series | #3B9EFF | colors.secondary |
| Tertiary series | #4FC3F7 | BRAND_SCALE[400] |
| Success/positive | #34D399 | colors.success |
| Warning/caution | #FBBF24 | colors.warning |

No external hues. No red for data (red reserved for error/destructive only).

#### Additional Web Tokens (globals.css .dark block — add if not present)

```css
--color-brand-primary: #15AAF2;
--color-brand-secondary: #3B9EFF;
--shadow-focus-primary: 0 0 0 2px rgba(21, 170, 242, 0.4);  /* renamed from --shadow-focus-volt */
```

#### Overlay, Skeleton (cross-platform reference)

| Purpose | Web | Mobile token | Value |
|---|---|---|---|
| Modal backdrop | rgba(0,0,0,0.6) | colors.overlay | #00000099 |
| Skeleton base | bg-surface-3 | colors.skeletonBase | #1C2320 |
| Skeleton shimmer | bg-surface-4 | colors.skeletonHighlight | #2A3330 |
| Brand glow | .fire-glow | shadows.glow | rgba(21,170,242,0.3–0.45) |

### 3.3 Spacing Scale

Both platforms use a 4px base grid. The naming differs — here is the cross-platform mapping:

| Mobile token | Mobile value (px) | Web Tailwind | Web CSS prop | Notes |
|---|---|---|---|---|
| spacing.xs | 4 | p-1 / gap-1 | --space-1: 0.25rem | Micro gaps |
| spacing.sm | 8 | p-2 / gap-2 | --space-2: 0.5rem | Tight gaps, icon spacing |
| spacing.md | 16 | p-4 / gap-4 | --space-4: 1rem | Standard card padding, section gaps |
| spacing.lg | 24 | p-6 / gap-6 | --space-6: 1.5rem | Large card padding, section separators |
| spacing.xl | 32 | p-8 / gap-8 | --space-8: 2rem | Page padding, hero sections |
| spacing.xxl | 48 | p-12 / gap-12 | --space-12: 3rem | Section breaks |
| spacing.xxxl | 64 | p-16 / gap-16 | --space-16: 4rem | Hero vertical padding |

layout.pagePadding = spacing.lg = 24px — use p-6 on web section containers.
layout.cardPadding = spacing.md = 16px — use p-4 on web cards (compact variant).

### 3.4 Border Radius — Resolving the Naming Mismatch

The two platforms use different radius values for the same semantic names. Do NOT change either platform's values — they are correct for their respective platform density (web components are smaller/denser than mobile touch targets).

| Semantic intent | Web class | Web px | Mobile token | Mobile px | Rationale |
|---|---|---|---|---|---|
| Micro (tight containers) | rounded-sm | 4px | — | — | Web only — dense UI chips |
| Small (buttons, inputs) | rounded-md | 8px | radius.sm | 8px | Match — use for interactive elements |
| Medium (cards, panels) | rounded-lg | 12px | radius.md | 12px | Match — use for content cards |
| Large (modals, sheets) | rounded-xl or rounded-2xl | 16–24px | radius.lg | 16px | Modals/bottom sheets |
| Extra large (media cards) | rounded-3xl | 24px | radius.xl | 24px | Full-bleed media cards |
| Full circle | rounded-full | 9999px | radius.full | 9999 | Avatars, badges |

Component radius rules:

| Component | Web class | Mobile token |
|---|---|---|
| Buttons (all sizes) | rounded-md (8px) | radius.md (12px) |
| Input fields | rounded-md (8px) | radius.md (12px) |
| Cards (default) | rounded-lg (12px) | radius.lg (16px) |
| Cards (compact) | rounded-lg (12px) | radius.md (12px) |
| Modals | rounded-xl (16px) | radius.lg (16px) |
| Badges / chips | rounded-full | radius.full |
| Avatars | rounded-full | radius.full |
| Tooltips | rounded-md (8px) | — |
| Bottom sheets (mobile) | — | radius.xl (24px) top corners |
| DashboardCard (web) | rounded-xl (NOTE: change from rounded-2xl per §6.2.5) | — |

### 3.5 Shadows and Elevation

#### Web Shadows (globals.css additions)

```css
/* Elevation scale */
--shadow-sm:  0 1px 3px rgba(0,0,0,0.3);
--shadow-md:  0 4px 12px rgba(0,0,0,0.4);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.5);
--shadow-xl:  0 16px 48px rgba(0,0,0,0.6);

/* Interactive states */
--shadow-focus-primary: 0 0 0 2px rgba(21, 170, 242, 0.4);
/* NOTE: rename from --shadow-focus-volt — Volt is retired */

/* Brand glow (keep existing .fire-glow, add explicit variable) */
--shadow-brand-glow: 0 0 24px rgba(21, 170, 242, 0.45);
```

Brand glow usage rules:
- Apply `.fire-glow` only on: primary CTA buttons (Button lg primary variant), hero section primary CTA on hover.
- On mobile: apply `shadows.glow` only on: `ContinueWorkoutCard` dominant card.
- Do NOT apply glow to: nav items, form inputs, metric cards, badges, icon buttons, or any secondary UI.

#### Mobile Shadows (tokens.ts — DO NOT CHANGE existing values)

```ts
shadows.sm:  { shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }
shadows.md:  { shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 }
shadows.glow: { shadowColor: '#15AAF2', shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 }
```

### 3.6 Icons

**Decision:** Lucide stays on web (already consistent), custom SVG stays on mobile (already consistent). Both use 2px stroke weight for visual compatibility.

Icon sizing rules (applies to both platforms):

| Context | Size |
|---|---|
| Dense tables, metadata, badge icons | 16px |
| Sidebar nav items (web current: size={18}) | 18px — KEEP |
| Standard UI buttons, inputs | 20px |
| Primary actions, section headers, tab bar (mobile) | 24px |
| Hero / decorative (landing page features) | 32px |

Never use emoji as icons on any surface. Replace with:
- Web: Lucide icons (already installed, import from lucide-react)
- Mobile: custom SVG components from shared/components/icons/

### 3.7 Motion Principles

#### Duration Scale

| Category | Duration | Applies to |
|---|---|---|
| Micro-interactions | 200ms | Hover state changes, focus rings, toggle switches, badge color changes |
| Standard transitions | 300ms | Modal open/close, sheet open/close, dropdown open/close |
| Content entrance | 450ms | Page content stagger (see DashboardCard: already uses 0.45s — KEEP) |
| Workout feedback | 400ms | Set completion checkmark, progress bar fill |

#### Easing

| Usage | Curve |
|---|---|
| Entrances (content appearing) | cubic-bezier(0.22, 1, 0.36, 1) — already used in DashboardCard |
| Exits (content disappearing) | ease-out |
| Bounce feedback (mobile: set complete, PR) | Reanimated withSpring defaults |
| Standard state changes | ease-in-out |

#### Web (Framer Motion)

```ts
// Standard entrance (used in DashboardCard — KEEP, do not change):
transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}

// Micro-interaction (hover, focus):
transition={{ duration: 0.2, ease: 'easeInOut' }}

// Modal/sheet entrance:
transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
```

#### Mobile (Reanimated 4.x only — do NOT mix with RN Animated API)

```ts
// Bounce feedback (set complete, PR celebration):
withSpring(targetValue, { damping: 15, stiffness: 300 })

// Standard state change:
withTiming(targetValue, { duration: 200 })

// Content entrance:
withTiming(1, { duration: 400 })

// Active tab pill width (onboarding dots, progress indicators):
withSpring(targetWidth, { damping: 20, stiffness: 200 })
```

#### Animate (DO):
- Workout set completion checkmark
- PR celebration flash
- Progress bar fill (existing in ProgressBar — keep)
- Tab bar active indicator
- Onboarding progress dot width
- Modal/sheet entrance scale

#### Do NOT animate:
- Data table rows
- Form labels
- Loading spinners (use skeleton instead)
- Pagination page numbers
- Sidebar nav items on initial page load

---

## 4. WEB COMPONENT LIBRARY — SPECIFICATION

All components go in: `apps/web/src/components/ui/`

### 4.1 Button

**File:** `apps/web/src/components/ui/Button.tsx`

**Variants:** `primary | secondary | ghost | destructive | icon-button`

**Sizes:** `sm` (h-8, 32px) | `md` (h-10, 40px) | `lg` (h-12, 48px)

**Props interface:**
```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon-button';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**Visual specification:**

| Variant | Default bg | Default text | Border | Hover bg | Focus ring |
|---|---|---|---|---|---|
| primary | bg-brand-primary | text-white | none | bg-brand-primary-hover | --shadow-focus-primary |
| secondary | bg-surface-2 | text-text-primary | border border-surface-3 | bg-surface-3 | --shadow-focus-primary |
| ghost | transparent | text-text-secondary | none | bg-surface-3 | --shadow-focus-primary |
| destructive | bg-error/10 | text-error | border border-error/30 | bg-error/20 | 0 0 0 2px rgba(255,90,95,0.4) |
| icon-button | transparent | text-text-secondary | none | bg-surface-3 | --shadow-focus-primary |

**Size classes:**

| Size | Height | Padding (x) | Font | Border-radius | Min-width |
|---|---|---|---|---|---|
| sm | h-8 (32px) | px-3 | text-body-sm font-medium | rounded-md | auto |
| md | h-10 (40px) | px-4 | text-body-sm font-semibold | rounded-md | 44px |
| lg | h-12 (48px) | px-6 | text-body font-semibold | rounded-md | 200px for primary |

**Loading state:** Show `<Loader2 size={16} className="animate-spin" />` replacing left icon or prepended before text. Disable pointer events. Do not change button dimensions.

**Disabled state:** `opacity-40 cursor-not-allowed pointer-events-none`

**Accessibility:** `role="button"`, `aria-disabled` when disabled, `aria-busy` when loading. Focus visible must show `--shadow-focus-primary` ring (not outline:none without replacement).

**Brand glow rule:** Only apply `.fire-glow` class to Button primary lg variant, and only in hero sections (landing page CTA). Not globally on all primary buttons.

### 4.2 Input

**File:** `apps/web/src/components/ui/Input.tsx`

**Variants:** `default | with-leading-icon | with-trailing-icon`

**States:** default | focused | error | disabled

**Props interface:**
```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
}
```

**Visual spec:**
- Height: h-10 (40px)
- Background: bg-surface-2 (#141416 dark)
- Border: border border-surface-3, on focus: border-brand-primary ring-1 ring-brand-primary/40
- Border-radius: rounded-md (8px)
- Text: text-body-sm text-text-primary
- Placeholder: text-text-muted
- Error state: border-error ring-1 ring-error/30, text stays text-text-primary
- Disabled: opacity-50 cursor-not-allowed bg-surface-1
- Padding: px-3 py-2, with leading icon: pl-9 pr-3, with trailing icon: pl-3 pr-9
- Leading/trailing icon container: absolute inset-y-0 flex items-center, icon size 16px text-text-muted
- Label: ALWAYS rendered above input (never placeholder-as-label). text-body-sm font-medium text-text-secondary mb-1

**Accessibility:** `htmlFor` linking label to input. `aria-invalid="true"` on error state. `aria-describedby` pointing to error message element.

### 4.3 Select

**File:** `apps/web/src/components/ui/Select.tsx`

Extends Input shell visually. Uses native `<select>` element for accessibility baseline, or a custom Radix UI Select for advanced variants.

**Visual spec:**
- Same height, background, border, radius as Input
- Trailing icon: `<ChevronDown size={16} />` from lucide-react, positioned right-3, text-text-muted
- Dropdown panel: bg-surface-2, border border-surface-3, rounded-lg, shadow-xl (--shadow-xl), z-50
- Dropdown item height: 40px, px-3, text-body-sm
- Dropdown item hover: bg-surface-3
- Selected item: bg-brand-primary/10 text-brand-primary (NOT orange border — that spec error is overridden here)
- Max dropdown height: 240px with overflow-y-auto

### 4.4 Checkbox, Radio, Toggle

**File:** `apps/web/src/components/ui/Controls.tsx`

**Checkbox visual:**
- Size: 16px × 16px
- Unchecked: border border-surface-3 rounded-sm bg-surface-2
- Checked: bg-brand-primary border-brand-primary, white checkmark icon (Check size={12})
- Indeterminate: bg-brand-primary/60 border-brand-primary, white minus icon
- Disabled: opacity-40 cursor-not-allowed
- Focus: --shadow-focus-primary ring
- Label: text-body-sm text-text-primary, gap-2 from checkbox

**Radio visual:**
- Size: 16px × 16px, rounded-full
- Unchecked: border border-surface-3 bg-surface-2
- Checked: border-2 border-brand-primary, inner dot 8px bg-brand-primary
- States same as Checkbox

**Toggle (Switch) visual:**
- Track off: w-9 h-5, bg-surface-3, rounded-full
- Track on: bg-brand-primary
- Thumb: w-4 h-4, bg-white, rounded-full, shadow-sm
- Thumb position: translate-x-0 (off) → translate-x-4 (on), transition-transform 200ms ease-in-out
- Disabled: opacity-40

### 4.5 Badge

**File:** `apps/web/src/components/ui/Badge.tsx`

**Variants:** `success | warning | error | info | neutral | brand`

**Props interface:**
```ts
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}
```

**Visual spec:**
- Shape: rounded-full (pill)
- Size sm: px-2 py-0.5 text-[10px] font-semibold
- Size md: px-2.5 py-1 text-xs font-semibold (default)
- Icon: size 12px, gap-1 from text

| Variant | Background | Text color |
|---|---|---|
| success | bg-success/15 | text-success |
| warning | bg-warning/15 | text-warning |
| error | bg-error/15 | text-error |
| info | bg-info/15 | text-info |
| neutral | bg-surface-3 | text-text-secondary |
| brand | bg-brand-primary/15 | text-brand-primary |

After Phase 1, `text-success`, `text-error`, `text-warning`, `text-info` are driven by CSS variables.

### 4.6 Card

**File:** `apps/web/src/components/ui/Card.tsx`

**Variants:** `base | interactive | metric | athlete | workout`

**Props interface:**
```ts
interface CardProps {
  variant?: 'base' | 'interactive' | 'metric' | 'athlete' | 'workout';
  padding?: 'compact' | 'default' | 'spacious';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
```

**Padding variants:**
- compact: p-3 (12px)
- default: p-4 (16px) — matches layout.cardPadding
- spacious: p-6 (24px)

**Base visual (all variants share this):**
- Background: bg-surface-2 (#141416 dark)
- Border: border border-white/5
- Border-radius: rounded-xl (NOTE: this is the corrected value — see §6.2.5)
- Transition: transition-colors duration-200

**interactive variant adds:**
- hover:border-white/10 hover:bg-surface-3 cursor-pointer

**metric variant adds:**
- Same as base, no hover (data-display only)

**athlete variant adds:**
- Interactive + left-accent: relative overflow-hidden, before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand-primary (only when athlete is active/at-risk)

**workout variant adds:**
- Interactive + ring on focus: focus-visible:ring-2 focus-visible:ring-brand-primary

### 4.7 Modal

**File:** `apps/web/src/components/ui/Modal.tsx`

**Variants:** `standard` (max-w-[520px]) | `confirmation` (max-w-[400px]) | `full-screen`

**Visual spec:**
- Backdrop: fixed inset-0 bg-black/60 z-50, backdrop-blur-sm
- Panel: bg-surface-2, border border-white/8, rounded-xl (standard/confirmation), rounded-none (full-screen)
- Entrance animation: scale from 0.95 to 1.0, opacity 0 to 1, duration 300ms ease [0.22,1,0.36,1]
- Exit animation: scale 0.95, opacity 0, duration 200ms ease-out
- Header: px-6 pt-6, flex items-center justify-between, title text-h3 font-display, close button icon-button variant
- Body: px-6 py-4, overflow-y-auto
- Footer: px-6 pb-6, flex justify-end gap-3

**Accessibility:** role="dialog", aria-modal="true", aria-labelledby pointing to title, focus trap on open, Escape key closes, restore focus on close.

### 4.8 Toast / Notification

**File:** `apps/web/src/components/ui/Toast.tsx` (wrapper around sonner)

**Configuration** (in root layout.tsx):
```tsx
<Toaster
  theme="dark"
  position="top-right"
  toastOptions={{
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
      borderRadius: '8px',
    },
    duration: 4000,
  }}
/>
```

**Variants:** success | warning | error | info

Use sonner's `toast.success()`, `toast.warning()`, `toast.error()`, `toast()` directly — do not build a custom toast component. The Toaster configuration above ensures brand alignment.

For manual usage:
```ts
import { toast } from 'sonner';
toast.success('Workout saved', { description: '3 exercises logged' });
toast.error('Failed to save', { description: 'Check your connection' });
```

### 4.9 EmptyState

**File:** `apps/web/src/components/ui/EmptyState.tsx`

**Variants:** `loading | empty | error | offline`

**Props interface:**
```ts
interface EmptyStateProps {
  variant: 'loading' | 'empty' | 'error' | 'offline';
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ElementType;
}
```

**Visual spec for each variant:**
- Container: flex flex-col items-center justify-center py-16 px-6 text-center gap-4
- Icon container: w-12 h-12 rounded-full flex items-center justify-center
- Title: text-h4 text-text-primary (Inter 600)
- Message: text-body-sm text-text-secondary max-w-xs
- Action button: Button md secondary variant

| Variant | Icon | Icon bg | Icon color | Default title |
|---|---|---|---|---|
| loading | use Skeleton shimmer rows instead of spinner | — | — | — |
| empty | Inbox (lucide) | bg-surface-3 | text-text-muted | 'Nothing here yet' |
| error | AlertTriangle (lucide) | bg-error/10 | text-error | 'Something went wrong' |
| offline | WifiOff (lucide) | bg-surface-3 | text-text-muted | 'No connection' |

**NEVER use a perpetual spinner.** The loading variant renders N skeleton rows (caller specifies count) using the Skeleton component.

### 4.10 Skeleton

**File:** `apps/web/src/components/ui/Skeleton.tsx`

**Props interface:**
```ts
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}
```

**Visual spec:**
- Background: bg-surface-3
- Shimmer: animate-pulse (Tailwind) OR custom shimmer via:
  ```css
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  background: linear-gradient(90deg, var(--bg-card) 25%, #2A2A2C 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  ```
- Border-radius: matches element being replaced (pass rounded prop)
- No text content inside skeleton element

### 4.11 Table

**File:** `apps/web/src/components/ui/Table.tsx`

**Visual spec:**
- Container: overflow-x-auto, rounded-xl border border-white/5
- thead: bg-surface-1, text-overline text-text-muted, px-4 py-3
- tbody row: border-t border-surface-3, hover:bg-surface-3 transition-colors
- tbody row selected: bg-brand-primary/10
- td/th: px-4 py-3 text-body-sm
- Sortable column header: flex items-center gap-1, ChevronUp/ChevronDown size={12} text-text-muted, active sort column: text-text-primary
- Pagination: flex items-center justify-between px-4 py-3 border-t border-surface-3
- Page size selector: Select sm variant, options [10, 25, 50]
- Page nav: Button ghost sm with ChevronLeft/ChevronRight icons

### 4.12 Dropdown Menu

**File:** `apps/web/src/components/ui/DropdownMenu.tsx`

**Visual spec:**
- Panel: bg-surface-2, border border-surface-3, rounded-lg, shadow-xl (--shadow-xl), z-50
- Item height: 40px, px-3, flex items-center gap-2, text-body-sm text-text-primary
- Item hover: bg-surface-3
- Separator: h-px bg-surface-3 mx-1 my-1
- Destructive item: text-error, hover:bg-error/10
- Checkmark on selected: Check size={14} text-brand-primary on left

### 4.13 Tooltip

**File:** `apps/web/src/components/ui/Tooltip.tsx`

**Visual spec:**
- Background: bg-surface-2, border border-surface-3, rounded-md, shadow-xl
- Text: text-body-sm text-text-primary, max-width: 280px
- Delay: 200ms open delay
- Arrow: 6px, bg-surface-2 with border, pointing toward trigger element
- Animation: opacity 0→1, translateY ±4px, duration 150ms ease-out

### 4.14 Avatar

**File:** `apps/web/src/components/ui/Avatar.tsx`

**Sizes:**
- sm: 24px (w-6 h-6), text-[9px]
- md: 32px (w-8 h-8), text-[11px]
- lg: 40px (w-10 h-10), text-xs
- xl: 48px (w-12 h-12), text-sm

**Visual spec:**
- Shape: rounded-full
- Image: object-cover, fill container
- Initials fallback: bg-gradient-to-br from-brand-primary/30 to-brand-primary/10, text-white font-bold Inter
- Active ring: ring-2 ring-brand-primary ring-offset-2 ring-offset-surface-0
- Status dot (optional): w-2.5 h-2.5 rounded-full border-2 border-surface-1, absolute bottom-0 right-0
  - Online: bg-success
  - Offline: bg-surface-3
  - Busy: bg-warning

### 4.15 Progress Bar

**File:** `apps/web/src/components/ui/ProgressBar.tsx`

Exported separately from the one in CoachDashboard.tsx (which remains inline there).

**Height variants:**
- xs: h-1 (4px)
- sm: h-1.5 (6px)
- md: h-2.5 (10px) — default, matches current CoachDashboard ProgressBar

**Visual spec:**
- Track: bg-white/5 rounded-full overflow-hidden
- Fill: bg-gradient-to-r from-brand-primary/70 to-brand-primary rounded-full
- Animation: Framer Motion width from 0 to value%, duration 1.1s ease [0.22,1,0.36,1]
- Label (optional): text-overline text-text-muted flex justify-between mb-1

### 4.16 Tabs

**File:** `apps/web/src/components/ui/Tabs.tsx`

**Two variants:**

**page-level (full-width with bottom border):**
- Container: border-b border-surface-3 flex gap-0
- Tab button: px-4 py-3 text-body-sm font-medium, relative
- Inactive: text-text-muted hover:text-text-secondary
- Active: text-text-primary, after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-primary

**section-level (pill/contained):**
- Container: bg-surface-1 rounded-lg p-1 flex gap-1 inline-flex
- Tab button: px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
- Inactive: text-text-muted hover:text-text-secondary
- Active: bg-surface-2 text-text-primary shadow-sm

### 4.17 Sidebar Navigation Item

**File:** `apps/web/src/components/ui/SidebarItem.tsx`

Used in CoachSidebar — extracted as a reusable component.

**Props interface:**
```ts
interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string | number;
  onClick?: () => void;
}
```

**Visual spec:**
- Container: w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative
- Default: text-text-secondary hover:text-text-primary hover:bg-surface-3
- Active: text-brand-primary bg-brand-primary/10
- Active indicator: border-l-2 border-brand-primary absolute left-0 inset-y-1 rounded-r-sm (NEW per §6.1 CHANGE 1)
- Disabled: opacity-40 cursor-not-allowed pointer-events-none
- Icon: size={18} (KEEP current)
- Badge: Badge sm neutral variant, ml-auto

### 4.18 Form Field Wrapper

**File:** `apps/web/src/components/ui/FormField.tsx`

Wraps any input component with label + error message + helper text.

**Props interface:**
```ts
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  helperText?: string;
  required?: boolean;
  htmlFor: string;
}
```

**Visual spec:**
- Label: text-body-sm (Inter 14px) font-medium text-text-secondary, mb-1
- Required indicator: text-error ml-1, aria-hidden="true"
- Error message: flex items-center gap-1 mt-1, AlertCircle size={11} text-error, text-[11px] text-error
- Helper text: text-[11px] text-text-muted mt-1
- Error takes precedence over helper text (only one shown at a time)
- htmlFor: passed to label as htmlFor attribute linking it to the input child

---

## 5. LANDING PAGE REDESIGN — FULL SPECIFICATION

**Decision: REDESIGN COMPLETE.** Current stub at `apps/web/src/app/(marketing)/page.tsx` answers none of the seven conversion questions. Full rebuild required.

### 5.1 Page Structure — 10 Sections

The new landing page consists of exactly these sections in order:

1. LandingNav (sticky header)
2. HeroSection
3. ProblemValueSection
4. HowItWorksSection
5. FeaturesShowcaseSection
6. StatsSection
7. TestimonialsSection
8. PricingSection
9. FinalCtaSection
10. FooterSection

All sections are built as separate components in `apps/web/src/features/marketing/components/`.

### 5.2 Navigation Header

**File:** `apps/web/src/features/marketing/components/LandingNav.tsx`

**Layout desktop (1280px):**
- Container: sticky top-0 z-50, transition-all duration-300
- Transparent on hero: bg-transparent
- Opaque on scroll (scrollY > 60): bg-surface-0/90 backdrop-blur-md border-b border-white/5
- Inner: max-w-7xl mx-auto px-6 h-16 flex items-center justify-between
- Left: Logo component (existing)
- Center: hidden lg:flex items-center gap-8 — nav links: Features, How It Works, Pricing, text-body-sm text-text-secondary hover:text-text-primary
- Right: flex items-center gap-3 — Button ghost sm 'Sign In', Button primary sm 'Get Started'

**Layout mobile (375px):**
- Hide center nav links
- Hide 'Sign In' button
- Show 'Get Started' Button primary sm
- Show hamburger MenuIcon size={20} for full nav sheet (optional enhancement — not required in P1)

**Accessibility:** nav element with aria-label="Main navigation". Active link aria-current="page".

### 5.3 Hero Section

**File:** `apps/web/src/features/marketing/components/HeroSection.tsx`

**Layout desktop (1280px):**
- Full viewport height (min-h-screen) dark surface
- 2-column grid: grid grid-cols-12 gap-8 items-center
- Left column: col-span-7, space-y-6
- Right column: col-span-5, product visual

**Left column content:**
- Overline: text-overline text-brand-primary/80 uppercase tracking-widest — 'For Coaches & Athletes'
- Headline: font-display (Montserrat) font-extrabold text-[56px] leading-[1.05] tracking-tight uppercase text-text-primary
- Subheadline: text-body-lg text-text-secondary max-w-[480px] — value proposition sentence
- CTA row: flex items-center gap-4 pt-2
  - Primary: Button lg primary 'Get Started Free' with .fire-glow on hover
  - Secondary: Button lg ghost 'Sign In →'
- Trust micro-copy: text-body-sm text-text-muted — '14-day free trial · No credit card required'

**Right column content:**
- Container: relative aspect-[4/3] rounded-2xl overflow-hidden
- Background: bg-surface-2 border border-white/5
- Content: dark-mode compatible product screenshot or abstract performance data visualization
- NOT a stock gym photo

**Background treatment:**
- bg-surface-0 (#0A0B0D)
- Radial gradient overlay: style={{ background: 'radial-gradient(ellipse at 70% 0%, rgba(21,170,242,0.12), transparent 60%)' }}
- Grain texture: .grain at 6% opacity (use existing .grain CSS class)

**Layout tablet (768px):**
- Single column, text centered, product visual below text, max-w-2xl mx-auto

**Layout mobile (375px):**
- Single column, text centered, product visual hidden (display:none), single CTA button full-width
- Sticky bottom bar: fixed bottom-0 inset-x-0 p-4 bg-surface-0/90 backdrop-blur-md border-t border-white/5
  - Button lg primary fullWidth 'Get Started Free'

**Headline animation:**
- opacity: 0, y: 20 → opacity: 1, y: 0
- Stagger: headline 0ms delay, subtitle 100ms delay, CTAs 200ms delay
- Duration: 600ms each, ease [0.22, 1, 0.36, 1]

**Copy structure (i18n keys to create in messages/en.json and messages/es.json):**
```
landing.hero.overline
landing.hero.headline
landing.hero.subheadline
landing.hero.primaryCta
landing.hero.secondaryCta
landing.hero.trustLine
```

### 5.4 Problem / Value Proposition Section

**File:** `apps/web/src/features/marketing/components/ProblemValueSection.tsx`

**Layout:** section-container, 3-column grid md:grid-cols-3 gap-8, py-20

**Three columns:**
1. Coach Problem: icon (AlertTriangle, 32px text-error), heading text-h3 'The Problem', body text-body-sm text-text-secondary
2. Solution Bridge: icon (Zap, 32px text-brand-primary), heading text-h3 'MR Training', body — the product explanation, bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-6
3. Athlete Outcome: icon (TrendingUp, 32px text-success), heading text-h3 'The Outcome', body text-body-sm text-text-secondary

**i18n keys:** landing.problem.coachTitle/Body, landing.problem.solutionTitle/Body, landing.problem.outcomeTitle/Body

### 5.5 How It Works Section

**File:** `apps/web/src/features/marketing/components/HowItWorksSection.tsx`

**Layout:** section-container, py-20, text-center heading + tabbed content

**Header:**
- Overline text-overline text-brand-primary, 'HOW IT WORKS'
- Heading font-display text-h1 text-text-primary

**Tabs:** section-level Tabs variant — 'For Coaches' | 'For Athletes'

**Coach tab content:** 5 numbered steps in a horizontal flow with connecting line
- Steps: Create Programs → Assign to Athletes → Monitor Progress → Adjust Plans → Track Revenue
- Step visual: circle with number, text below, connecting line between circles (1px bg-surface-3)

**Athlete tab content:** 5 numbered steps
- Steps: Download App → Connect with Coach → Get Today's Workout → Log Your Sets → Track Progress

Desktop: horizontal flex row. Tablet/mobile: vertical list with left connecting line.

### 5.6 Features Showcase Section

**File:** `apps/web/src/features/marketing/components/FeaturesShowcaseSection.tsx`

**Layout:** section-container, py-20, alternating left/right rows

**4 features:**

Feature 1 — AI Programming (row: text left, visual right):
- Icon: Sparkles size={32} text-brand-primary
- Heading: text-h2 font-display
- Body: text-body text-text-secondary
- Visual: abstract graphic or placeholder (200×150px bg-surface-2 rounded-xl)

Feature 2 — Real-time Analytics (row: visual left, text right):
- Icon: BarChart3 size={32} text-brand-primary

Feature 3 — Athlete Communication (row: text left, visual right):
- Icon: Users size={32} text-brand-primary

Feature 4 — Progress Tracking (row: visual left, text right):
- Icon: TrendingUp size={32} text-brand-primary

Each row: grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12. Feature text: space-y-4.

### 5.7 Stats Section

**File:** `apps/web/src/features/marketing/components/StatsSection.tsx`

**Layout:** section-container, py-20, bg-surface-1 rounded-3xl, 4-column grid md:grid-cols-4

**4 stats (animated counters using existing useCountUp pattern):**
1. Athletes — target: 1200+
2. Workouts Logged — target: 50000+
3. Coaches — target: 85+
4. Satisfaction — target: 98%

**Stat visual:** text-display (Montserrat 800, 48px) tabular-nums text-text-primary, label text-body-sm text-text-secondary below

**Counter animation:** Same useCountUp hook pattern from CoachDashboard — import or duplicate.

### 5.8 Testimonials Section

**File:** `apps/web/src/features/marketing/components/TestimonialsSection.tsx`

**Layout:** section-container, py-20, grid grid-cols-1 md:grid-cols-2 gap-8

**2 testimonials:**
1. Coach testimonial (left): Card spacious variant, Avatar xl, quote text-body-lg italic, name text-h4, role text-body-sm text-text-secondary
2. Athlete testimonial (right): same structure

Both cards have border-brand-primary/10 border.

### 5.9 Pricing Section

**File:** `apps/web/src/features/marketing/components/PricingSection.tsx`

**Layout:** section-container, py-20, grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto

**2 tiers:**

Tier 1 — Coach Monthly:
- Card spacious variant, border border-surface-3
- Price: text-display Montserrat, /month label text-body text-text-secondary
- Feature list: 8 items, CheckCircle size={16} text-success, text-body-sm
- CTA: Button lg primary fullWidth

Tier 2 — Coach Annual (recommended):
- Card spacious variant, ring-2 ring-brand-primary (highlighted)
- Badge 'BEST VALUE — Save 20%' in Badge success variant, positioned top-right
- Price: discounted price displayed large, original price small line-through text-text-muted
- Same feature list as monthly + 'Priority support' + 'Annual performance review'
- CTA: Button lg primary fullWidth .fire-glow

### 5.10 Final CTA Section

**File:** `apps/web/src/features/marketing/components/FinalCtaSection.tsx`

- Full-width dark band: bg-surface-1 py-24
- section-container, text-center, space-y-8
- Overline: text-overline text-brand-primary
- Heading: font-display text-display uppercase text-text-primary (large, impactful)
- Body: text-body-lg text-text-secondary max-w-xl mx-auto
- CTA: Button lg primary 'Start Free Trial' .fire-glow, min-w-[240px]
- Sub-text: text-body-sm text-text-muted '14-day trial · Cancel anytime · No credit card'

### 5.11 Footer

**File:** `apps/web/src/features/marketing/components/FooterSection.tsx`

- Container: bg-surface-0 border-t border-surface-3 py-16
- Grid: grid grid-cols-1 md:grid-cols-4 gap-8
- Col 1: Logo + tagline text-body-sm text-text-muted
- Col 2: 'Product' — Features, How It Works, Pricing, Changelog
- Col 3: 'Company' — About, Blog, Contact
- Col 4: 'Legal' — Privacy Policy, Terms of Service
- Bottom bar: mt-12 pt-6 border-t border-surface-3, flex justify-between — copyright text-body-sm text-text-muted + LanguageSwitcher component (existing)

### 5.12 Marketing Layout

**File:** `apps/web/src/app/(marketing)/layout.tsx`

Create this file to provide the sticky nav without wrapping the existing root layout:

```tsx
import { LandingNav } from '@/features/marketing/components/LandingNav';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <div className="pt-0">{children}</div>
    </>
  );
}
```

LandingNav handles its own sticky positioning and scroll transparency internally.

### 5.13 Conversion Strategy

- Primary CTA text: 'Get Started Free' — above fold (hero), sticky header ('Get Started'), final CTA section ('Start Free Trial')
- Trust signals near primary CTA: '14-day trial · No credit card required'
- Value proposition structure: [Coach Problem: athletes quit without structured programming] → [MR Training: AI-powered programming + real-time athlete monitoring] → [Outcome: coaches retain athletes longer and athletes achieve measurable goals]
- Mobile sticky bottom CTA: fixed bottom bar on mobile viewports (375px) — single Button lg primary 'Get Started Free' full-width, no sign-in link (reduces decision paralysis)

---

## 6. COACH PLATFORM REDESIGN

### 6.1 Navigation Sidebar

**File:** `apps/web/src/features/coach/components/layout/CoachSidebar.tsx`

**Decision: IMPROVE** — Structure is solid; color and state refinements only.

#### What to KEEP (no changes)

- `w-60 fixed left-0 top-0 h-screen` dimensions
- `bg-surface-1` background
- `border-r border-surface-3` right border
- `z-30` z-index
- `transition-transform duration-300 ease-out lg:translate-x-0` mobile open/close
- Active state: `text-brand-primary bg-brand-primary/10` — already correct
- Hover state: `hover:text-text-primary hover:bg-surface-3` — already correct
- Collapsible Training/Comercial sections with ChevronDown animation
- Today's Timeline section with Clock icon
- Backdrop `fixed inset-0 z-20 bg-black/50 lg:hidden` — correct
- Nav icon size: `size={18}` — keep
- Gap between icon and label: `gap-3` — keep

#### CHANGE 1 — Active item left indicator (visual anchor)

In every active nav button (both top-level and child items), add a left border indicator:

```tsx
// BEFORE (active top-level item):
'text-brand-primary bg-brand-primary/10'

// AFTER:
'relative text-brand-primary bg-brand-primary/10'
// and inside the button, add:
{active && <span className="absolute left-0 inset-y-1 w-0.5 rounded-r-sm bg-brand-primary" aria-hidden="true" />}
```

This gives a clear 2px spatial anchor without changing the color system. Apply to both top-level items and child items (the children currently have no active visual other than text color).

#### CHANGE 2 — Logo section ring treatment

```tsx
// BEFORE:
'flex items-center justify-center h-9 w-9 rounded-xl bg-surface-3 ring-1 ring-surface-4'

// AFTER:
'flex items-center justify-center h-9 w-9 rounded-xl bg-surface-3 ring-1 ring-white/8'
```

`ring-surface-4` maps to `var(--border)` which is `#1C1C1C` — almost invisible. `ring-white/8` gives a subtle but perceptible frosted glass edge.

#### CHANGE 3 — Today's Timeline summary indicator

When a time block is currently active (compare current time against block start/end times), show a small status indicator in the sidebar header area:

```tsx
// After the "Coach OS" span, conditionally render:
{currentBlockActive && (
  <div className="flex items-center gap-1.5 ml-auto">
    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
    <span className="text-[10px] text-brand-primary/80 uppercase tracking-wider truncate max-w-[80px]">
      {currentBlockName}
    </span>
  </div>
)}
```

This is a MINOR enhancement — implement only after CHANGE 1 and CHANGE 2.

#### NO CHANGES to:

- Core sidebar color system
- Navigation structure or items
- Collapsible logic
- Mobile open/close transition
- Today's Timeline data or presentation

### 6.2 Coach Dashboard

**File:** `apps/web/src/features/coach/components/dashboard/CoachDashboard.tsx`

**Decision: IMPROVE** — Preserve data density, SSR prefetch, count-up animation. Fix color discipline only.

#### 6.2.1 Fix FORMAT_STYLE Record

Locate the `FORMAT_STYLE` const (lines ~26-30):

```ts
// BEFORE:
const FORMAT_STYLE: Record<EventFormat, string> = {
  lista:      'bg-emerald-500/15 text-emerald-400',
  formulario: 'bg-blue-500/15 text-blue-400',
  running:    'bg-orange-500/15 text-orange-400',
}

// AFTER:
const FORMAT_STYLE: Record<EventFormat, string> = {
  lista:      'bg-success/15 text-success',
  formulario: 'bg-brand-primary/15 text-brand-primary',
  running:    'bg-brand-primary/20 text-brand-primary/80',
}
```

Requires `success` to be added as a CSS-variable-based Tailwind color (done in Phase 1, §9.1).

#### 6.2.2 Fix MetricCard accent prop values

Locate the four MetricCard calls in the metrics grid. Replace accent strings:

```tsx
// MetricCard index=0 (Ingresos):
accent="bg-success/20"         // was: "bg-emerald-500/20 text-emerald-400"

// MetricCard index=1 (Atletas activos):
accent="bg-brand-primary/20"  // was: "bg-blue-500/20 text-blue-400"

// MetricCard index=2 (Nuevos este mes):
accent="bg-brand-primary/20"  // was: "bg-purple-500/20 text-purple-400"

// MetricCard index=3 (Pagos pendientes):
accent="bg-warning/20"         // was: "bg-amber-500/20 text-amber-400"
```

In the MetricCard component definition, change the Icon's className:

```tsx
// BEFORE:
<Icon size={18} className="text-white" />

// AFTER:
<Icon size={18} className="text-current" />
```

`text-current` inherits the text color from the accent container. When accent="bg-success/20", the container needs a text color too — so adjust accent prop to include text color:

```tsx
// Full corrected accent strings (background + icon text color):
accent="bg-success/20 text-success"        // revenue
accent="bg-brand-primary/20 text-brand-primary"  // athletes
accent="bg-brand-primary/20 text-brand-primary"  // new athletes
accent="bg-warning/20 text-warning"        // pending payments
```

Then in MetricCard:
```tsx
<div className={cn('shrink-0 rounded-xl p-2.5', accent)}>
  <Icon size={18} className="text-current" />
</div>
```

#### 6.2.3 Fix MetricCard trend badges

Locate the trend badge span inside MetricCard:

```tsx
// BEFORE:
trendUp ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'

// AFTER:
trendUp ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
```

#### 6.2.4 Fix remaining multi-accent occurrences in CoachDashboard

After the MetricCard fixes, grep for remaining non-brand color classes:

1. Dashboard Hero — streak widget:
```tsx
// BEFORE:
<div className="rounded-xl bg-orange-500/15 p-2 text-orange-400">
// AFTER:
<div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
```

2. Dashboard Hero — trophy widget:
```tsx
// BEFORE:
<div className="rounded-xl bg-yellow-500/15 p-2 text-yellow-400">
// AFTER:
<div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
```

3. Quick Actions panel:
```tsx
// BEFORE:
{ color: 'text-blue-400 bg-blue-500/10' },   // Athletes
{ color: 'text-emerald-400 bg-emerald-500/10' }, // Workouts
// AFTER:
{ color: 'text-brand-primary bg-brand-primary/10' },  // Athletes
{ color: 'text-brand-primary bg-brand-primary/10' },  // Workouts
```
(Today already has 'text-brand-primary bg-brand-primary/10' — keep it)

4. Goals section — Crecimiento card:
```tsx
// BEFORE:
<div className="rounded-xl bg-purple-500/15 p-2 text-purple-400">
// AFTER:
<div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
```

5. Goals section — Tu racha card (Flame icon):
```tsx
// BEFORE:
<div className="rounded-xl bg-orange-500/15 p-2 text-orange-400">
<Zap size={20} className="text-orange-400" />
// AFTER:
<div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
<Zap size={20} className="text-brand-primary" />
```

6. Revenue chart card header:
```tsx
// BEFORE:
<div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
// AFTER:
<div className="rounded-xl bg-success/15 p-2 text-success">
```

7. Revenue evolution badge:
```tsx
// BEFORE:
className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-400"
// AFTER:
className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success"
```

8. Events card header:
```tsx
// BEFORE:
<div className="rounded-xl bg-blue-500/15 p-2 text-blue-400">
// AFTER:
<div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
```

9. Distribución por plan card:
```tsx
// BEFORE:
<div className="rounded-xl bg-purple-500/15 p-2 text-purple-400">
// AFTER:
<div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
```

10. Ventas hoy chart card:
```tsx
// BEFORE:
<div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
// Ventas badge: bg-emerald-500/15 text-emerald-400
// Bar chart: from-emerald-500/50 to-emerald-500/90
// AFTER:
<div className="rounded-xl bg-success/15 p-2 text-success">
// Ventas badge: bg-success/15 text-success
// Bar chart: from-success/50 to-success/90
```

11. Athlete Readiness severity badges:
```tsx
// BEFORE:
a.flag?.severity === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
// AFTER:
a.flag?.severity === 'high' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
```

#### 6.2.5 DashboardCard border-radius adjustment

```tsx
// BEFORE (in DashboardCard className):
'rounded-2xl border border-white/5 bg-surface-1 p-5'

// AFTER:
'rounded-xl border border-white/5 bg-surface-1 p-5'
```

rounded-xl (12px) is consistent with the Card component spec. The dashboard Hero section card stays rounded-3xl (it's a special hero, not a data card).

#### 6.2.6 Tablet responsive fix — metrics grid

Locate the metrics grid div (the 4-MetricCard container):

```tsx
// BEFORE:
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

// AFTER:
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
```

(No visible change at sm/md but correctly documents the intent — sm and md are both 2-col.)

Also fix the Goals/streaks grid:
```tsx
// BEFORE:
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

// AFTER: KEEP as-is — md:grid-cols-2 already present
```

### 6.3 Athletes Page

**Decision: IMPROVE**

**File:** `apps/web/src/features/coach/components/athletes/AthletesPage.tsx` (inspect existing path and update accordingly)

**Layout spec:**

1. Header bar: flex items-center justify-between gap-4 mb-6
   - Left: heading text-h2 font-display 'Athletes'
   - Right: flex gap-3
     - Input component with MagnifyingGlass size={16} leading icon, placeholder 'Search athletes...', w-64
     - Select component for status filter: All / Active / At Risk / Inactive / New, w-36
     - Select component for sort: Last Session / Name / Readiness, w-44

2. Table or FlashList of athlete rows

3. Athlete row layout (use Table component):
   - Avatar lg (40px) + name Inter 14px font-medium + role text-body-sm text-text-muted
   - Status Badge variant (success=active, warning=at-risk, error=inactive, neutral=new)
   - Last session date: text-body-sm text-text-muted
   - Readiness number: text-body-sm font-semibold, color-coded (>=75: text-success, 50-74: text-warning, <50: text-error)
   - Quick action: Button sm ghost with ArrowUpRight icon

4. Empty state: EmptyState empty variant, 'No athletes yet', Button md primary 'Invite Athlete'

5. Loading state: 6× Skeleton rows, each h-[72px] shimmer

### 6.4 Coach Today Page

**Decision: IMPROVE**

**File:** Inspect at `apps/web/src/features/coach/components/today/` (use the existing Today component)

**Time block visual spec:**

Active block:
- Container: bg-brand-primary/10, border-l-4 border-brand-primary, rounded-lg p-4, relative z-10
- Title: text-h4 font-display text-brand-primary
- Shadow: box-shadow: 0 0 12px rgba(21,170,242,0.15) (subtle glow, not fire-glow full intensity)
- Left border animation on becoming active: CSS transition `border-left-width 200ms ease-out` from 0 to 4px
- Time display: text-overline text-brand-primary/70

Completed blocks:
- Container: opacity-50
- Icon: replace block icon with Check size={16} text-success
- Title: line-through text-text-muted

Upcoming blocks:
- Default Card base variant treatment — no special styling

Timeline vertical connector:
- Container: relative, before:absolute before:inset-y-0 before:left-[1.1875rem] before:w-px before:bg-surface-3
  (1.1875rem = half of 38px block icon width)

Block transition when active: add `transition-all duration-200` to block container class.

### 6.5 Workout Builder

**Decision: KEEP / MINOR IMPROVE**

No structural changes. Apply only:
1. Replace any raw `<button>` with Button component appropriate variant
2. Apply Card compact variant (p-3 rounded-xl border border-white/5) to exercise cards
3. Exercise card within builder: flex items-center gap-3. Drag handle: 6px wide, bg-surface-6 (use `className="w-1.5 self-stretch bg-surface-6 rounded-sm cursor-grab active:cursor-grabbing"`). Exercise name: Inter 14px font-semibold text-text-primary. Sets×reps summary: text-body-sm text-text-muted. Edit: Button icon-button sm.

### 6.6 Auth Pages

**Decision: IMPROVE**

#### 6.6.1 AuthShell gradient fix

**File:** `apps/web/src/features/auth/components/AuthShell.tsx`

```tsx
// REMOVE this line entirely:
<div className="fixed inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top,_#FF6B00,_transparent_70%)]" />

// REPLACE with (MR Blue subtle top glow, same opacity):
<div className="fixed inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_top,_#15AAF2,_transparent_70%)]" />
```

If the designer prefers no background glow on auth pages, the replacement div can be removed entirely without a fallback. The `bg-gradient-to-b from-surface-1 via-surface-0 to-surface-0` is sufficient.

#### 6.6.2 Role selector on sign-in

**File:** `apps/web/src/features/auth/components/SignInPage.tsx` or wherever the Clerk SignIn component is rendered.

Add before or after the Clerk `<SignIn />` component:

```tsx
<div className="glass-card rounded-lg p-4 mb-6 flex items-start gap-3">
  <Smartphone size={18} className="text-brand-primary shrink-0 mt-0.5" />
  <div>
    <p className="text-body-sm font-medium text-text-primary">Athlete? Use the mobile app</p>
    <p className="text-[11px] text-text-muted mt-0.5">
      Train with your coach program — download the MR Training mobile app to get started.
    </p>
  </div>
</div>
```

This surfaces product clarity without creating a confusing athlete web auth path.

#### 6.6.3 Clerk appearance configuration

Wherever `<SignIn />` or `<SignUp />` are rendered, pass appearance prop:

```tsx
<SignIn
  appearance={{
    variables: {
      colorPrimary: '#15AAF2',
      colorBackground: '#141416',
      colorText: '#FFFFFF',
      colorTextSecondary: '#9CA3AF',
      borderRadius: '8px',
    },
    elements: {
      card: 'bg-transparent shadow-none border-0',
      formButtonPrimary: 'bg-brand-primary hover:bg-[#0E93D4] text-white',
    },
  }}
/>
```


---

## 7. MOBILE APP REDESIGN

### 7.1 GlassDock Fix

**File:** `apps/mobile/src/shared/components/ui/GlassDock.tsx`

**Decision: IMPROVE — one-line fix**

Locate the `styles.bar` StyleSheet:

```ts
// BEFORE:
bar: {
  ...
  borderTopColor: 'rgba(200,255,0,0.08)',  // Volt green — RETIRED
  borderTopWidth: StyleSheet.hairlineWidth,
  ...
}

// AFTER:
bar: {
  ...
  borderTopColor: colors.border,  // #242B28 — correct border token
  borderTopWidth: StyleSheet.hairlineWidth,
  ...
}
```

Ensure `colors` is imported from `'../../theme/tokens'` — it already is in this file.

No other changes to GlassDock. Tab icon size, active pill, text colors, shadow layers — all KEEP.

### 7.2 ActivityRings Fix

**File:** `apps/mobile/src/shared/components/fitness/ActivityRings.tsx`

**Decision: IMPROVE — token compliance only**

```tsx
// BEFORE:
const MOVE_COLOR = '#15AAF2';
const EXERCISE_COLOR = '#34D399';
const RECOVERY_COLOR = '#3B9EFF';

// AFTER:
import { colors } from '../../theme/tokens';

// In the rings array definition:
{ progress: ..., color: colors.primary,   r: radius },
{ progress: ..., color: colors.success,   r: radius - strokeWidth * 2.5 },
{ progress: ..., color: colors.secondary, r: radius - strokeWidth * 5 },
```

Remove the three const declarations entirely. Import colors at the top of the file.
No changes to SVG structure, animation, or ring math.

### 7.3 RecoveryScreen Token Compliance

**File:** `apps/mobile/src/features/recovery/presentation/screens/RecoveryScreen.tsx`

**Decision: IMPROVE — three inline style replacements**

Import typography and fontFamilies if not already imported:
```ts
import { colors, spacing, typography, fontFamilies } from '../../../../shared/theme/tokens';
```

**Fix 1 — eyebrow style:**
```ts
// BEFORE:
eyebrow: {
  fontSize: 10, fontWeight: '700', letterSpacing: 3,
  color: colors.primary, marginBottom: spacing.xs,
},

// AFTER:
eyebrow: {
  ...typography.overline,
  color: colors.primary,
  marginBottom: spacing.xs,
},
// typography.overline = { fontFamily: Inter_700Bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.1, textTransform: 'uppercase' }
```

**Fix 2 — title style:**
```ts
// BEFORE:
title: { fontSize: 28, fontWeight: '700', lineHeight: 34, marginBottom: spacing.lg, color: colors.text },

// AFTER:
title: {
  ...typography.h2,
  marginBottom: spacing.lg,
  color: colors.text,
},
// typography.h2 = { fontFamily: Montserrat_800ExtraBold (after font install) or Inter_800ExtraBold (before), fontSize: 24, lineHeight: 30, letterSpacing: -0.01 }
// Accept the 4px size difference (28→24). Token compliance matters more than exact preservation.
```

**Fix 3 — sectionEyebrow style:**
```ts
// BEFORE:
sectionEyebrow: {
  fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
  color: colors.textSecondary, marginBottom: spacing.md,
},

// AFTER:
sectionEyebrow: {
  ...typography.caption,
  fontFamily: fontFamilies.bodySemiBold,
  color: colors.textSecondary,
  marginBottom: spacing.md,
},
// typography.caption = { fontFamily: Inter_500Medium, fontSize: 11, lineHeight: 15, letterSpacing: 0.02 }
// fontFamilies.bodySemiBold = 'Inter_600SemiBold'
```

No other changes to RecoveryScreen.

### 7.4 WelcomeScreen Logo Fix

**File:** `apps/mobile/src/features/auth/presentation/screens/WelcomeScreen.tsx`

**Decision: IMPROVE — replace text monogram with actual logo**

The file already imports `Image` from `expo-image`. The asset `icon.png` exists at `apps/mobile/assets/icon.png` (confirmed by audit).

```tsx
// BEFORE (in the header View):
<View style={styles.iconCircle}>
  <Text style={styles.iconText}>MR</Text>
</View>

// AFTER:
<Image
  source={require('../../../../../assets/icon.png')}
  style={{ width: 72, height: 72, borderRadius: 16 }}
  contentFit="contain"
  cachePolicy="memory"
/>
```

Also remove the `iconCircle` and `iconText` entries from the StyleSheet (they become dead code). Remove `fontFamilies` from the import if it was only used for `iconText`. Keep all other styles unchanged.

Note: The card items inside the `cards` View also use `cardMonogram` with `MR` and `+` text — those are intentional card labels (not logo replacements) and should KEEP as-is.

### 7.5 Tokens.ts — Error Color and Montserrat

**File:** `apps/mobile/src/shared/theme/tokens.ts`

**Required changes:**

1. Error color unification:
```ts
// BEFORE:
error: '#FF6B6B',

// AFTER:
error: '#FF5A5F',  // unified with web spec canonical value
```

2. Montserrat font families (AFTER running `npx expo install @expo-google-fonts/montserrat`):
```ts
// BEFORE:
export const fontFamilies = {
  displayBlack: 'Inter_800ExtraBold',
  display: 'Inter_800ExtraBold',
  displayBold: 'Inter_800ExtraBold',
  ...
}

// AFTER:
export const fontFamilies = {
  displayBlack: 'Montserrat_800ExtraBold',
  display: 'Montserrat_800ExtraBold',
  displayBold: 'Montserrat_700Bold',
  heading: 'Inter_700Bold',         // KEEP
  body: 'Inter_400Regular',         // KEEP
  bodyMedium: 'Inter_500Medium',    // KEEP
  bodySemiBold: 'Inter_600SemiBold', // KEEP
  bodyBold: 'Inter_700Bold',        // KEEP
  bodyExtraBold: 'Inter_800ExtraBold', // KEEP
}
```

3. Typography tokens that use displayBlack/display/displayBold — these auto-update via the fontFamilies references:
```ts
typography.display.fontFamily = fontFamilies.display  // → Montserrat_800ExtraBold
typography.h1.fontFamily = fontFamilies.displayBold   // → Montserrat_800ExtraBold  
typography.h2.fontFamily = fontFamilies.displayBold   // → Montserrat_800ExtraBold
```

All other typography tokens (h3 through caption, metric*) remain on Inter. No changes needed.

### 7.6 Today Screen Improvements

**File:** `apps/mobile/src/features/today/presentation/screens/TodayScreen.tsx`

**Decision: IMPROVE — spacing and section header consistency**

#### What to KEEP (no changes):
- ContinueWorkoutCard as dominant hero element (bg-primary, glow shadow, play button) — DO NOT change
- ActivityRings 3-ring readiness display position
- ContinueWorkoutCard position (first after header)
- Pull-to-refresh RefreshControl

#### Changes:

1. Screen header update — if a header View exists, change greeting/date typography:
```tsx
// Greeting text:
style={{ ...typography.h2, color: colors.text }}  // Montserrat after font install

// Date text:
style={{ ...typography.caption, color: colors.textSecondary }}
```

2. Section spacing — between every major section (Scoreboard, Sessions, PRs, Challenge, NewsFeed), ensure `marginTop: spacing.lg` (24px). Within a section, `gap: spacing.md` (16px) between items.

3. Section header component — before each major section block, add a SectionHeader pattern:
```tsx
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
  <Text style={{ ...typography.overline, color: colors.textSecondary }}>
    {sectionTitle}
  </Text>
  {/* optional: see-all link */}
</View>
```

4. Pull-to-refresh tint:
```tsx
<RefreshControl tintColor={colors.primary} ... />
```
Verify this is already set. If not, add it.

5. NewsFeed cards — ensure each card uses:
```tsx
backgroundColor: colors.surface,
borderRadius: radius.lg,    // 16px
padding: spacing.md,        // 16px
borderWidth: StyleSheet.hairlineWidth,
borderColor: colors.border,
```

### 7.7 Progress Screen

**Decision: IMPROVE**

**File:** `apps/mobile/src/features/training/presentation/screens/ProgressScreen.tsx` (or wherever the Progress tab screen lives — verify path)

**Spec:**

1. Period selector — SegmentedFilter component:
```tsx
// Use existing SegmentedFilter from shared/components/ui/ or build one:
// Options: ['Week', 'Month', 'Year']
// Container: backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: 4
// Active segment: backgroundColor: colors.primary, borderRadius: radius.sm
// Text: typography.label, inactive: colors.textSecondary, active: colors.onPrimary
```

2. Performance summary cards — StatGrid 2-column layout:
```tsx
// StatCard spec:
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.md,
// Number: typography.metricMD (32px Inter_800ExtraBold) color: colors.text
// Label: typography.caption color: colors.textSecondary
// Trend: typography.caption color: colors.success (positive) or colors.error (negative)
```

3. Per-exercise chart:
- Primary series color: colors.primary (#15AAF2)
- Comparison series color: colors.secondary (#3B9EFF)
- Bar chart background: colors.surfaceRaised
- Chart height: 160px
- X-axis labels: typography.caption color: colors.textSecondary

4. PR timeline — vertical list:
- Each row: flexDirection row, justifyContent space-between, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border
- Exercise name: typography.body color: colors.text
- PR value: typography.metricSM (24px) color: colors.primary
- Date: typography.caption color: colors.textSecondary

5. Loading state: EmptyState loading variant (skeleton rows)

6. Empty state: EmptyState empty variant, message: 'Log your first workout to see progress'

### 7.8 Profile Screen

**Decision: IMPROVE**

**File:** `apps/mobile/src/features/profile/presentation/screens/ProfileScreen.tsx` (verify path)

**Structure:**

1. Avatar section (centered):
   - Avatar: 80px circular, bg-gradient-to-br from-brand-primary/30 to-brand-primary/10, initials Inter_700Bold 28px
   - Name: typography.h3 color: colors.text, marginTop: spacing.md
   - Role/membership badge: backgroundColor: colors.primarySoft, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs
   - Badge text: typography.caption fontFamily: fontFamilies.bodySemiBold color: colors.primary

2. Stats section — StatGrid 3-column:
   - Workouts completed | Current streak | PRs set
   - Number: typography.metricMD color: colors.text
   - Label: typography.caption color: colors.textSecondary

3. List sections with ListCard pattern:
   - Each section has an overline header: typography.overline color: colors.textSecondary marginBottom: spacing.sm
   - ListCard: flexDirection row, alignItems center, padding spacing.md, backgroundColor colors.surface, borderRadius radius.lg, marginBottom: spacing.xs
   - Leading icon: 20px, color: colors.textSecondary
   - Label: typography.body color: colors.text
   - Trailing: ChevronRight size={16} color: colors.textSecondary

   Section groups:
   - Training Preferences: Goal Type, Training Days, Intensity Level
   - Personal Data: Weight & Height, Age, Sports
   - Subscription: Plan name (Badge brand variant) or 'No Plan' (Badge warning variant)
   - Settings: Notifications, Language, Theme
   - Help: FAQ, Contact Support
   - Sign Out: ListCard with colors.error text, NO trailing ChevronRight

4. Spacing: spacing.lg (24px) between sections.

### 7.9 Membership / Paywall Screen

**Decision: SPECIFY**

**File:** `apps/mobile/src/features/membership/presentation/screens/MembershipScreen.tsx` (create or update)

**Layout (top to bottom):**

1. ScreenHeader: title 'Choose Your Plan', back button if navigated from within app

2. Trial callout banner:
```tsx
<View style={{
  backgroundColor: colors.primarySoft,  // #15AAF21A
  borderRadius: radius.md,
  padding: spacing.md,
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  marginBottom: spacing.lg,
}}>
  <CheckIcon size={18} color={colors.primary} />
  <Text style={{ ...typography.bodyStrong, color: colors.text, flex: 1 }}>
    Try free for 14 days — cancel anytime
  </Text>
</View>
```

3. Billing toggle (Monthly / Annual):
```tsx
// SegmentedFilter with options: ['Monthly', 'Annual']
// Annual shows savings badge: 'Save 20%' in bg-success/15 text-success
```

4. Plan cards (shown based on billing toggle selection):
```tsx
// Card base style:
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.lg,  // 24px = spacious
marginBottom: spacing.md,

// Selected state (ring):
borderWidth: 2,
borderColor: colors.primary,

// Plan name: typography.h4 color: colors.text
// Price: typography.metricMD (32px) color: colors.text, /month in typography.body color: colors.textSecondary
// Original price (annual): typography.body color: colors.textSecondary, textDecorationLine: 'line-through'
```

5. Feature list (below plan cards):
```tsx
// Each feature:
<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm }}>
  <CheckIcon size={16} color={colors.success} />
  <Text style={{ ...typography.body, color: colors.text, flex: 1 }}>{feature}</Text>
</View>
```

6. Primary CTA — full-width Button:
```tsx
// PrimaryButton component, label: 'Start Free Trial'
// backgroundColor: colors.primary
// minHeight: 56px
// borderRadius: radius.md
// Apply glow shadow: shadows.glow
```

7. Secondary CTA:
```tsx
<Pressable onPress={onContinueWithoutPlan} style={{ alignItems: 'center', padding: spacing.md }}>
  <Text style={{ ...typography.body, color: colors.textSecondary }}>Continue without plan</Text>
</Pressable>
```

### 7.10 Onboarding Improvements

**File:** `apps/mobile/src/features/auth/presentation/screens/OnboardingScreen.tsx` (or equivalent onboarding slide screens)

**Decision: IMPROVE — motion guidance only, no structural changes**

Slide entrance animation:
```ts
// Per slide, using Reanimated:
opacity: withTiming(1, { duration: 400 })
translateY: withSpring(0, { from: 30, damping: 20, stiffness: 200 })
```

Progress dots animation:
```ts
// Active dot:
width: withSpring(24, { damping: 20, stiffness: 200 })  // expands from 8 to 24
borderRadius: withTiming(radius.full)
backgroundColor: colors.primary

// Inactive dots:
width: withTiming(8, { duration: 200 })
backgroundColor: colors.border
```

Swipe parallax (optional enhancement, P3):
- Background/decorative elements translate at 0.3× scroll speed
- Foreground content translates at 1× scroll speed
- Implement via Reanimated shared value derived from scroll position


---

## 8. SCREEN-BY-SCREEN PRIORITY TABLE

| Surface | Screen | Route / Component | Decision | Priority | Primary Change | Effort |
|---|---|---|---|---|---|---|
| **Web — Landing** | Landing Page | `(marketing)/page.tsx` | REDESIGN | P1 | Full rebuild — 10 sections | XL |
| **Web — Landing** | Marketing Layout | `(marketing)/layout.tsx` | REDESIGN | P1 | Create new layout with LandingNav | S |
| **Web — Landing** | LandingNav | `marketing/LandingNav.tsx` | REDESIGN | P1 | New sticky nav component | M |
| **Web — Landing** | HeroSection | `marketing/HeroSection.tsx` | REDESIGN | P1 | New hero: headline + product visual | L |
| **Web — Landing** | ProblemValueSection | `marketing/ProblemValueSection.tsx` | REDESIGN | P1 | 3-col value prop | M |
| **Web — Landing** | HowItWorksSection | `marketing/HowItWorksSection.tsx` | REDESIGN | P2 | Tabbed steps | M |
| **Web — Landing** | FeaturesShowcaseSection | `marketing/FeaturesShowcaseSection.tsx` | REDESIGN | P2 | 4 alternating feature rows | M |
| **Web — Landing** | StatsSection | `marketing/StatsSection.tsx` | REDESIGN | P2 | Animated counters | S |
| **Web — Landing** | TestimonialsSection | `marketing/TestimonialsSection.tsx` | REDESIGN | P3 | 2-col testimonial cards | S |
| **Web — Landing** | PricingSection | `marketing/PricingSection.tsx` | REDESIGN | P2 | 2-tier pricing with annual badge | M |
| **Web — Landing** | FinalCtaSection | `marketing/FinalCtaSection.tsx` | REDESIGN | P2 | Full-width CTA band | S |
| **Web — Landing** | FooterSection | `marketing/FooterSection.tsx` | REDESIGN | P2 | 4-col footer with lang switcher | M |
| **Web — Auth** | AuthShell | `auth/components/AuthShell.tsx` | IMPROVE | P1 | Remove #FF6B00 gradient → #15AAF2 | S |
| **Web — Auth** | Sign-In Page | `auth/sign-in/` | IMPROVE | P1 | Add Athlete role info banner | S |
| **Web — Auth** | Sign-Up Page | `auth/sign-up/` | IMPROVE | P2 | Clerk appearance tokens | S |
| **Web — Auth** | Clerk Appearance | Sign-In + Sign-Up | IMPROVE | P2 | colorPrimary #15AAF2, borderRadius 8px | S |
| **Web — Coach** | Coach Dashboard | `coach/dashboard/CoachDashboard.tsx` | IMPROVE | P1 | Multi-accent color fix (15+ changes) | M |
| **Web — Coach** | Metric Cards | `CoachDashboard.tsx` MetricCard | IMPROVE | P1 | accent prop + trend badge colors | S |
| **Web — Coach** | FORMAT_STYLE | `CoachDashboard.tsx` | IMPROVE | P1 | emerald/blue/orange → success/brand | S |
| **Web — Coach** | Dashboard Hero Widgets | `CoachDashboard.tsx` streak/trophy | IMPROVE | P1 | orange/yellow → brand-primary | S |
| **Web — Coach** | Dashboard tablet grid | `CoachDashboard.tsx` metrics div | IMPROVE | P1 | add md:grid-cols-2 | S |
| **Web — Coach** | DashboardCard radius | `CoachDashboard.tsx` DashboardCard | IMPROVE | P2 | rounded-2xl → rounded-xl | S |
| **Web — Coach** | Coach Sidebar | `layout/CoachSidebar.tsx` | IMPROVE | P2 | Left-border active indicator + ring | S |
| **Web — Coach** | Sidebar logo ring | `CoachSidebar.tsx` | IMPROVE | P2 | ring-surface-4 → ring-white/8 | S |
| **Web — Coach** | Athletes Page | `athletes/AthletesPage.tsx` | IMPROVE | P2 | Table + status badges + skeleton | M |
| **Web — Coach** | Coach Today | `today/` | IMPROVE | P2 | Block active/completed visual spec | M |
| **Web — Coach** | Workout Builder | `workouts/` | IMPROVE | P3 | Button/Card component adoption | M |
| **Web — Design System** | globals.css semantic colors | `app/globals.css` | IMPROVE | P1 | Fix error/success/warning hex values | S |
| **Web — Design System** | tailwind.config.ts semantics | `tailwind.config.ts` | IMPROVE | P1 | CSS var-based success/error/warning | S |
| **Web — Design System** | rules/02-design-system.md | `apps/rules/02-design-system.md` | IMPROVE | P1 | Fix Archivo reference to Montserrat | S |
| **Web — Design System** | shadow-focus-volt rename | `globals.css` | IMPROVE | P1 | --shadow-focus-volt → --shadow-focus-primary | S |
| **Web — Components** | Button | `components/ui/Button.tsx` | REDESIGN | P1 | New component per §4.1 spec | M |
| **Web — Components** | Badge | `components/ui/Badge.tsx` | REDESIGN | P1 | New component per §4.5 spec | S |
| **Web — Components** | Input | `components/ui/Input.tsx` | REDESIGN | P1 | New component per §4.2 spec | M |
| **Web — Components** | FormField | `components/ui/FormField.tsx` | REDESIGN | P1 | New wrapper per §4.18 spec | S |
| **Web — Components** | Select | `components/ui/Select.tsx` | REDESIGN | P2 | New component per §4.3 spec | M |
| **Web — Components** | Skeleton | `components/ui/Skeleton.tsx` | REDESIGN | P1 | New shimmer per §4.10 spec | S |
| **Web — Components** | EmptyState | `components/ui/EmptyState.tsx` | REDESIGN | P1 | New component per §4.9 spec | S |
| **Web — Components** | Card | `components/ui/Card.tsx` | REDESIGN | P1 | New variants per §4.6 spec | M |
| **Web — Components** | Modal | `components/ui/Modal.tsx` | REDESIGN | P2 | New animated modal per §4.7 spec | M |
| **Web — Components** | Table | `components/ui/Table.tsx` | REDESIGN | P2 | New sortable table per §4.11 spec | L |
| **Web — Components** | Tabs | `components/ui/Tabs.tsx` | REDESIGN | P2 | page-level + section-level per §4.16 | M |
| **Web — Components** | Controls | `components/ui/Controls.tsx` | REDESIGN | P2 | Checkbox + Radio + Toggle per §4.4 | M |
| **Web — Components** | Toast/Toaster config | `app/layout.tsx` | IMPROVE | P1 | Sonner dark theme config | S |
| **Mobile — Auth** | WelcomeScreen | `auth/screens/WelcomeScreen.tsx` | IMPROVE | P1 | Replace MR text monogram with logo Image | S |
| **Mobile — Auth** | Onboarding | `auth/screens/OnboardingScreen.tsx` | IMPROVE | P3 | Motion guidance for slides/dots | M |
| **Mobile — Tabs** | GlassDock | `shared/components/ui/GlassDock.tsx` | IMPROVE | P1 | borderTopColor Volt → colors.border | S |
| **Mobile — Tabs** | Today Tab | `today/screens/TodayScreen.tsx` | IMPROVE | P2 | Section spacing + SectionHeader | M |
| **Mobile — Tabs** | Progress Tab | `training/screens/ProgressScreen.tsx` | IMPROVE | P2 | Chart spec + period selector + PR list | L |
| **Mobile — Tabs** | Recovery Tab | `recovery/screens/RecoveryScreen.tsx` | IMPROVE | P1 | 3x inline style → typography tokens | S |
| **Mobile — Tabs** | Profile Tab | `profile/screens/ProfileScreen.tsx` | IMPROVE | P2 | Stats section + ListCard structure | M |
| **Mobile — Stack** | Membership/Paywall | `membership/screens/MembershipScreen.tsx` | IMPROVE | P2 | Plan cards + CTA spec | L |
| **Mobile — Tokens** | tokens.ts error color | `shared/theme/tokens.ts` | IMPROVE | P1 | #FF6B6B → #FF5A5F | S |
| **Mobile — Tokens** | tokens.ts Montserrat | `shared/theme/tokens.ts` | IMPROVE | P2 | Add Montserrat fontFamilies + update display/h1/h2 | M |
| **Mobile — Shared** | ActivityRings | `shared/components/fitness/ActivityRings.tsx` | IMPROVE | P1 | Hardcoded hex → colors.* tokens | S |
| **Mobile — DO NOT TOUCH** | WorkoutExecutionScreen | `training/screens/WorkoutExecutionScreen.tsx` | KEEP | — | No changes | — |
| **Mobile — DO NOT TOUCH** | ExerciseCard (execution) | `execution/ExerciseCard.tsx` | KEEP | — | No changes | — |
| **Mobile — DO NOT TOUCH** | RestOverlay | `execution/RestOverlay.tsx` | KEEP | — | No changes | — |
| **Mobile — DO NOT TOUCH** | SetInput | `execution/SetInput.tsx` | KEEP | — | No changes | — |
| **Mobile — DO NOT TOUCH** | CompletionSummary | `execution/CompletionSummary.tsx` | KEEP | — | No changes | — |
| **Mobile — DO NOT TOUCH** | RepCounter | `execution/RepCounter.tsx` | KEEP | — | No changes | — |
| **Mobile — DO NOT TOUCH** | AthleteTabs | `navigation/AthleteTabs.tsx` | KEEP | — | No structural changes | — |

---

## 9. SENIOR REACT DEVELOPER — IMPLEMENTATION PLAN

### 9.1 Phase 1 — Design System Foundation (Must Complete First)

These changes must land before any component or feature work. All subsequent changes depend on these tokens being correct.

**Step 1 — `apps/web/src/app/globals.css`**

In the `.dark` block, update:
```css
--color-error:   #FF5A5F;   /* was: #FF3D00 */
--color-success: #34D399;   /* was: #00C853 */
--color-warning: #FBBF24;   /* was: #FFB300 */
--color-info:    #3B9EFF;   /* new — add this line */
--shadow-focus-primary: 0 0 0 2px rgba(21, 170, 242, 0.4);  /* new — renamed from --shadow-focus-volt */
```

Also update in `:root` (light mode):
```css
--color-error:   #FF5A5F;
--color-success: #34D399;
--color-warning: #FBBF24;
--color-info:    #3B9EFF;
```

Remove any `--shadow-focus-volt` reference if it exists. Rename to `--shadow-focus-primary`.

**Step 2 — `apps/web/tailwind.config.ts`**

In the `colors` section, replace static hex semantic values with CSS variable references:
```ts
// REPLACE:
success: '#00C853',
error:   '#FF3D00',
warning: '#FFB300',

// WITH:
success: 'var(--color-success)',
error:   'var(--color-error)',
warning: 'var(--color-warning)',
info:    'var(--color-info)',
```

Add a comment block above the BRAND_SCALE remapping section:
```ts
// TAILWIND COLOR REMAPPING NOTE:
// orange, blue, sky, cyan, indigo, purple, violet, fuchsia, pink, teal
// are ALL remapped to the MR Blue BRAND_SCALE (#15AAF2 ramp).
// This means bg-orange-500 renders as #15AAF2, bg-purple-500 renders as #15AAF2, etc.
// This is intentional — it enforces the single-accent rule across the codebase.
// Use bg-brand-primary / text-brand-primary for explicit brand color intent.
// Use success/error/warning for semantic intent.
// emerald, amber, yellow, green, red are NOT remapped — they render as Tailwind defaults.
// Avoid these in new code — use CSS variable-based semantic tokens instead.
```

**Step 3 — `apps/rules/02-design-system.md`** (or wherever the design system doc lives)

Find every occurrence of `Archivo` and replace with `Montserrat`. The font decision is FIRM: Montserrat Bold for display/headings.

**Step 4 — Verify Montserrat font loading in globals.css**

Confirm the @import or @font-face for Montserrat includes weight 800 (ExtraBold):
```css
/* Should be present — verify: */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
```
If fontDisplay: swap is not in the @import URL, add `&display=swap`. This prevents FOUT during landing page load.

**Step 5 — Rename --shadow-focus-volt to --shadow-focus-primary**

Search the entire `apps/web/src` directory for any usage of `--shadow-focus-volt` and replace with `--shadow-focus-primary`. This is the focus ring variable; it must not reference the retired Volt color brand.

### 9.2 Phase 2 — Shared Component Library

Build in this exact order (respects dependencies):

1. **Button** (`components/ui/Button.tsx`) — no dependencies, needed by everything
2. **Badge** (`components/ui/Badge.tsx`) — no dependencies
3. **Skeleton** (`components/ui/Skeleton.tsx`) — no dependencies
4. **EmptyState** (`components/ui/EmptyState.tsx`) — depends on Skeleton
5. **Input** (`components/ui/Input.tsx`) — no dependencies
6. **FormField** (`components/ui/FormField.tsx`) — depends on Input
7. **Select** (`components/ui/Select.tsx`) — depends on Input shell
8. **Controls** (`components/ui/Controls.tsx`) — no dependencies (Checkbox/Radio/Toggle)
9. **Card** (`components/ui/Card.tsx`) — no dependencies
10. **Modal** (`components/ui/Modal.tsx`) — depends on Button, Card-like container
11. **Toast config in layout** (`app/layout.tsx`) — depends on Phase 1 CSS vars
12. **Table** (`components/ui/Table.tsx`) — depends on Skeleton for loading, Badge for status
13. **Dropdown** (`components/ui/DropdownMenu.tsx`) — no hard dependencies
14. **Tooltip** (`components/ui/Tooltip.tsx`) — no hard dependencies
15. **Avatar** (`components/ui/Avatar.tsx`) — no dependencies
16. **ProgressBar** (`components/ui/ProgressBar.tsx`) — no dependencies
17. **Tabs** (`components/ui/Tabs.tsx`) — no dependencies
18. **SidebarItem** (`components/ui/SidebarItem.tsx`) — no dependencies

### 9.3 Phase 3 — Landing Page

Implement in this order (top-down, sequential — no parallelization benefit):

1. Create `apps/web/src/app/(marketing)/layout.tsx` — marketing layout wrapper
2. Build `LandingNav.tsx` — sticky nav (needed above all content)
3. Build `HeroSection.tsx` — above-fold, highest conversion priority
4. Build `StatsSection.tsx` — quick win, uses only useCountUp pattern
5. Build `ProblemValueSection.tsx` — 3-column static layout
6. Build `HowItWorksSection.tsx` — tabbed steps
7. Build `FeaturesShowcaseSection.tsx` — alternating rows
8. Build `PricingSection.tsx` — card variants + annual toggle
9. Build `TestimonialsSection.tsx` — static content cards
10. Build `FinalCtaSection.tsx` — simple CTA band
11. Build `FooterSection.tsx` — 4-column footer
12. Replace `apps/web/src/app/(marketing)/page.tsx` with the composition page

Wire all i18n translation keys in `messages/en.json` and `messages/es.json` for all landing page copy.

**No backend dependencies for this phase.** All landing page content is static or hardcoded.

### 9.4 Phase 4 — Coach Platform Improvements

These changes CAN be parallelized across multiple developers:

**Track A (independent, no Phase 2 deps):**
- AuthShell gradient fix: `auth/components/AuthShell.tsx` — remove #FF6B00 div (S, 5 min)
- Sidebar active left-border indicator: `layout/CoachSidebar.tsx` (S, 30 min)
- Sidebar logo ring: `layout/CoachSidebar.tsx` (S, 5 min)
- Dashboard tablet grid: `CoachDashboard.tsx` — add md:grid-cols-2 (S, 5 min)
- Dashboard DashboardCard radius: `CoachDashboard.tsx` — rounded-2xl → rounded-xl (S, 5 min)
- Auth sign-in Athlete role info banner (S, 30 min)

**Track B (requires Phase 1 CSS variable tokens):**
- Dashboard multi-accent color fix: all §6.2.1–6.2.4 changes (M, 2-3h)
- FORMAT_STYLE fix (S, 10 min — part of above)
- MetricCard accent + trend badge fixes (S, 30 min — part of above)

**Track C (requires Phase 2 component library):**
- Athletes Page: EmptyState + Skeleton + Badge status (M, 3-4h)
- Coach Today: Block visual treatment with active/completed states (M, 2-3h)

### 9.5 Technical Notes

**Tailwind color remapping side effect:**
`bg-orange-500` renders as MR Blue `#15AAF2` because `orange` is aliased to BRAND_SCALE in tailwind.config.ts. This confuses developers who expect Tailwind's default orange. The comment block added in Phase 1 Step 2 documents this explicitly.

**CSS custom property migration:**
After Phase 1, the static hex values in tailwind.config.ts (e.g., `success: '#00C853'`) must be REMOVED and replaced with `'var(--color-success)'`. This enables dark/light mode correctness. The static values were wrong AND non-responsive to theme changes.

**Font loading verification:**
Montserrat is already in globals.css. Verify it loads weight 800 (ExtraBold) before building the landing page hero. The hero headline uses `font-extrabold` (weight 800) — if this weight is not imported, the fallback will be system-sans which looks completely wrong.

**Framer Motion already installed:**
No new npm dependencies needed for Phases 1-4. Framer Motion: already installed. Lucide React: already installed. Sonner: already installed.

**Toaster setup (one-time change):**
In `apps/web/src/app/layout.tsx`, add:
```tsx
import { Toaster } from 'sonner';
// Inside the body:
<Toaster
  theme="dark"
  position="top-right"
  toastOptions={{
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
      borderRadius: '8px',
    },
    duration: 4000,
  }}
/>
```

**cn() utility:** All components must use `cn()` from `@/lib/utils` for conditional class merging, not string concatenation.

**Server vs Client components:** Landing page sections should be React Server Components by default. Only add 'use client' to components that use state, effects, or browser APIs (LandingNav scroll detection, StatsSection count-up animation, HowItWorksSection tab state).


---

## 10. SENIOR REACT NATIVE DEVELOPER — IMPLEMENTATION PLAN

### 10.1 Phase 1 — Token Fixes (Must Complete First)

**File:** `apps/mobile/src/shared/theme/tokens.ts`

These are small but critical changes. Run `npx tsc --noEmit` before and after.

**Change 1 — Error color unification:**
```ts
// BEFORE:
error: '#FF6B6B',

// AFTER:
error: '#FF5A5F',
```

**Change 2 — Verify base color (DO NOT CHANGE):**
```ts
base: '#0B0F0E',  // KEEP — acceptable variation from web #0A0B0D
```

**Change 3 — Add Montserrat fontFamilies (AFTER font package install):**

First, install the font package:
```bash
cd apps/mobile && npx expo install @expo-google-fonts/montserrat
```

Then in `app/_layout.tsx` (or wherever useFonts is configured), add:
```ts
import {
  useFonts,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

// Add to the existing useFonts call alongside Inter variants:
const [fontsLoaded] = useFonts({
  // ... existing Inter fonts ...
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
});
```

Then update tokens.ts fontFamilies:
```ts
export const fontFamilies = {
  displayBlack: 'Montserrat_800ExtraBold',  // was: 'Inter_800ExtraBold'
  display:      'Montserrat_800ExtraBold',  // was: 'Inter_800ExtraBold'
  displayBold:  'Montserrat_700Bold',       // was: 'Inter_800ExtraBold'
  heading:       'Inter_700Bold',           // KEEP
  body:          'Inter_400Regular',        // KEEP
  bodyMedium:    'Inter_500Medium',         // KEEP
  bodySemiBold:  'Inter_600SemiBold',       // KEEP
  bodyBold:      'Inter_700Bold',           // KEEP
  bodyExtraBold: 'Inter_800ExtraBold',      // KEEP
} as const;
```

The typography.display, h1, h2 tokens auto-update because they reference `fontFamilies.display` and `fontFamilies.displayBold`.

**Change 4 — Verify all other colors match unified spec (no changes needed):**
```ts
success: '#34D399',  // CORRECT — keep
warning: '#FBBF24',  // CORRECT — keep
primary: '#15AAF2',  // CORRECT — keep
```

### 10.2 Phase 2 — Component Fixes

Implement in this exact order (each is independent, can be done in parallel):

**Fix 1 — GlassDock (5 minutes):**
File: `apps/mobile/src/shared/components/ui/GlassDock.tsx`

```ts
// BEFORE (in styles.bar):
borderTopColor: 'rgba(200,255,0,0.08)',

// AFTER:
borderTopColor: colors.border,
```

Verify `colors` is already imported from `'../../theme/tokens'`. It is — no new import needed.

**Fix 2 — ActivityRings (15 minutes):**
File: `apps/mobile/src/shared/components/fitness/ActivityRings.tsx`

```tsx
// REMOVE these three lines:
const MOVE_COLOR = '#15AAF2';
const EXERCISE_COLOR = '#34D399';
const RECOVERY_COLOR = '#3B9EFF';

// ADD import at top:
import { colors } from '../../theme/tokens';

// UPDATE rings array (find the rings const and replace color values):
const rings = [
  { progress: Math.min(1, Math.max(0, move)),     color: colors.primary,   r: radius },
  { progress: Math.min(1, Math.max(0, exercise)), color: colors.success,   r: radius - strokeWidth * 2.5 },
  { progress: Math.min(1, Math.max(0, recovery)), color: colors.secondary, r: radius - strokeWidth * 5 },
];
```

Note: there is also `color={\`${color}20\`}` for the track circle — this becomes `color={\`${colors.primary}20\`}` etc. The template literal pattern stays the same, just the color source changes.

**Fix 3 — RecoveryScreen (30 minutes):**
File: `apps/mobile/src/features/recovery/presentation/screens/RecoveryScreen.tsx`

Three style replacements as specified in §7.3. Import `fontFamilies` if not already imported. Run tsc after.

**Fix 4 — WelcomeScreen (20 minutes):**
File: `apps/mobile/src/features/auth/presentation/screens/WelcomeScreen.tsx`

Replace `iconCircle` + `iconText` View with Image component as specified in §7.4.
Asset path confirmed: `../../../../../assets/icon.png` (from screen depth to assets folder).
Image already imported from expo-image. No new import needed.

### 10.3 Phase 3 — Screen Improvements

Implement in this order (P2 items):

**Step 1 — Today Screen section spacing (M effort):**
File: `apps/mobile/src/features/today/presentation/screens/TodayScreen.tsx`
Changes per §7.6: section spacing, SectionHeader pattern, pull-to-refresh tint, NewsFeed card styling.

**Step 2 — Progress Screen (L effort):**
Find the Progress screen file (likely `apps/mobile/src/features/progress/` or `apps/mobile/src/features/training/presentation/screens/ProgressScreen.tsx`).
Build per §7.7: period selector, StatGrid, chart spec, PR timeline.

**Step 3 — Profile Screen (M effort):**
Find the Profile screen file (likely `apps/mobile/src/features/profile/presentation/screens/ProfileScreen.tsx`).
Build per §7.8: avatar section, 3-col stats, ListCard groups.

**Step 4 — Membership/Paywall Screen (L effort):**
Build or update per §7.9: trial banner, billing toggle, plan cards, feature list, CTA.

### 10.4 Technical Notes

**Font loading prerequisite:**
Montserrat font changes in tokens.ts MUST NOT be committed until `useFonts` is updated with Montserrat entries. If Montserrat fontFamilies are set before the fonts are loaded, every component using display/h1/h2 typography will show a fallback or throw a warning. Sequence: (1) install package, (2) add to useFonts, (3) update tokens.ts fontFamilies, (4) update typography tokens.

**Reanimated version rule:**
ALL animations must use Reanimated 4.x API: `withSpring`, `withTiming`, `useAnimatedStyle`, `useSharedValue`. Do NOT use React Native's built-in `Animated` API anywhere in new or modified code. Do NOT mix the two animation systems in the same component.

**Explicit NO-TOUCH list — workout execution flow:**
These files must NOT be modified under any circumstances:
```
apps/mobile/src/features/training/presentation/screens/WorkoutExecutionScreen.tsx
apps/mobile/src/features/training/presentation/components/execution/ExerciseCard.tsx
apps/mobile/src/features/training/presentation/components/execution/RestOverlay.tsx
apps/mobile/src/features/training/presentation/components/execution/SetInput.tsx
apps/mobile/src/features/training/presentation/components/execution/CompletionSummary.tsx
apps/mobile/src/features/training/presentation/components/execution/RepCounter.tsx
apps/mobile/src/features/training/presentation/components/execution/AiWorkoutCta.tsx
apps/mobile/src/navigation/AthleteTabs.tsx
```

**Token compliance grep after Phase 1:**
After completing Phase 1 token changes, run:
```bash
grep -r '#[0-9A-Fa-f]\{6\}' apps/mobile/src --include='*.tsx' --include='*.ts' | grep -v 'tokens.ts' | grep -v '.test.'
```
For each match, determine if it should be a token reference. Hardcoded hex values in component files are almost always wrong. Exceptions: gradient endpoints that are intentionally derived from brand colors (e.g., `${colors.primary}20` for alpha variants) are acceptable.

**TypeScript verification:**
Run `cd apps/mobile && npx tsc --noEmit` before starting Phase 1, after Phase 1, after Phase 2, and after Phase 3. Fix any type errors introduced before proceeding.

**Touch target compliance:**
All interactive elements must have `minHeight: layout.touchTarget` (48px) or `minWidth: layout.touchTarget`. Verify any new interactive elements meet this requirement. The layout.touchTarget token is already set to 48 in tokens.ts.

---

## 11. ACCEPTANCE CRITERIA

### 11.1 Web Acceptance Criteria

- [ ] `apps/web/src/app/globals.css` `.dark` block: `--color-error` is `#FF5A5F`
- [ ] `apps/web/src/app/globals.css` `.dark` block: `--color-success` is `#34D399`
- [ ] `apps/web/src/app/globals.css` `.dark` block: `--color-warning` is `#FBBF24`
- [ ] `apps/web/src/app/globals.css` `.dark` block: `--color-info` is `#3B9EFF`
- [ ] `apps/web/src/app/globals.css` contains `--shadow-focus-primary` (no `--shadow-focus-volt`)
- [ ] `apps/web/tailwind.config.ts` `success` value is `'var(--color-success)'` (not static hex)
- [ ] `apps/web/tailwind.config.ts` `error` value is `'var(--color-error)'` (not static hex)
- [ ] `apps/web/tailwind.config.ts` `warning` value is `'var(--color-warning)'` (not static hex)
- [ ] `apps/web/tailwind.config.ts` contains comment block documenting the BRAND_SCALE color remapping
- [ ] `apps/web/src/features/coach/components/dashboard/CoachDashboard.tsx` contains zero occurrences of `bg-emerald-`, `text-emerald-`, `bg-blue-`, `text-blue-`, `bg-orange-`, `text-orange-`, `bg-purple-`, `text-purple-`, `bg-amber-`, `text-amber-`, `bg-green-`, `text-green-`, `bg-yellow-`, `text-yellow-` (run grep to verify)
- [ ] `apps/web/src/features/auth/components/AuthShell.tsx` does not contain `#FF6B00`
- [ ] Landing page `apps/web/src/app/(marketing)/page.tsx` renders minimum 6 distinct sections (nav, hero, features, stats, pricing, footer)
- [ ] Landing page contains zero emoji characters used as icons (no `icon="🤖"`, `icon="📊"`, `icon="👥"` or similar)
- [ ] Landing page hero has a primary CTA using Button lg primary variant
- [ ] Landing page has a pricing section with at least 2 plan tiers
- [ ] Landing page nav has 'Sign In' and 'Get Started' buttons
- [ ] `apps/web/src/app/(marketing)/layout.tsx` exists with LandingNav import
- [ ] `apps/web/src/components/ui/Button.tsx` exists and exports Button component
- [ ] `apps/web/src/components/ui/Badge.tsx` exists and exports Badge component
- [ ] `apps/web/src/components/ui/Card.tsx` exists and exports Card component with variants
- [ ] `apps/web/src/components/ui/EmptyState.tsx` exists and exports EmptyState component
- [ ] `apps/web/src/components/ui/Skeleton.tsx` exists and exports Skeleton component
- [ ] All Button md and lg instances render at minimum 40px (md) and 48px (lg) height
- [ ] Coach sign-in page shows athlete product info / role clarification banner
- [ ] `apps/rules/02-design-system.md` contains no reference to `Archivo` as display font
- [ ] `pnpm lint` in `apps/web` passes with 0 errors
- [ ] `pnpm build` in `apps/web` completes without errors

### 11.2 Mobile Acceptance Criteria

- [ ] `apps/mobile/src/shared/theme/tokens.ts` `colors.error` is `'#FF5A5F'`
- [ ] `apps/mobile/src/shared/theme/tokens.ts` `colors.success` is `'#34D399'`
- [ ] `apps/mobile/src/shared/theme/tokens.ts` `colors.warning` is `'#FBBF24'`
- [ ] `apps/mobile/src/shared/theme/tokens.ts` `colors.primary` is `'#15AAF2'`
- [ ] `apps/mobile/src/shared/components/ui/GlassDock.tsx` `borderTopColor` is `colors.border` (not `rgba(200,255,0,...)`)
- [ ] `apps/mobile/src/shared/components/fitness/ActivityRings.tsx` does not contain hardcoded hex strings `'#15AAF2'`, `'#34D399'`, `'#3B9EFF'` as standalone const declarations — uses `colors.*` imports
- [ ] `apps/mobile/src/features/recovery/presentation/screens/RecoveryScreen.tsx` `eyebrow` style does not contain `fontSize: 10` raw — uses `typography.overline`
- [ ] `apps/mobile/src/features/recovery/presentation/screens/RecoveryScreen.tsx` `title` style does not contain `fontSize: 28` raw — uses `typography.h2`
- [ ] `apps/mobile/src/features/recovery/presentation/screens/RecoveryScreen.tsx` `sectionEyebrow` style does not contain `fontSize: 11` raw — uses `typography.caption`
- [ ] `apps/mobile/src/features/auth/presentation/screens/WelcomeScreen.tsx` does not contain a `View` with text `'MR'` as logo — uses `Image` component with assets/icon.png
- [ ] WorkoutExecutionScreen navigation flow is structurally unchanged — no file in `execution/` subfolder has been modified
- [ ] All new interactive touch elements have `minHeight: 48` or `minWidth: 48` (layout.touchTarget compliance)
- [ ] `cd apps/mobile && npx tsc --noEmit` passes with 0 errors after all Phase 1 and Phase 2 changes
- [ ] No new hardcoded hex values introduced in any component file outside `tokens.ts`
- [ ] GlassDock renders with correct colors.border (#242B28) top border at runtime (verify on device or simulator)

### 11.3 Cross-Platform Acceptance Criteria

- [ ] Error color: `apps/web/src/app/globals.css` `--color-error` (#FF5A5F) matches `apps/mobile/src/shared/theme/tokens.ts` `colors.error` (#FF5A5F)
- [ ] Success color: `globals.css` `--color-success` (#34D399) matches `tokens.ts` `colors.success` (#34D399)
- [ ] Warning color: `globals.css` `--color-warning` (#FBBF24) matches `tokens.ts` `colors.warning` (#FBBF24)
- [ ] Brand primary: web `brand.primary` (#15AAF2) matches mobile `colors.primary` (#15AAF2) — MR Blue is the ONLY non-semantic accent on both surfaces
- [ ] After Montserrat install: mobile `fontFamilies.display` is `'Montserrat_800ExtraBold'`, web `fontFamily.display` is `['Montserrat', ...]` — both surfaces use Montserrat for display/h1/h2
- [ ] No emoji characters used as icons on any surface (web landing, web coach platform, mobile app)
- [ ] `apps/rules/02-design-system.md` no longer references `Archivo` as display font — correctly documents Montserrat
- [ ] The Volt color `#C8FF00` / `rgba(200,255,0,...)` / `rgba(200, 255, 0, ...)` does not appear in any file in `apps/web/src` or `apps/mobile/src`
- [ ] The retired orange accent `#FF6B00` does not appear in any file in `apps/web/src`
- [ ] Both `pnpm build` (web) and `npx tsc --noEmit` (mobile) pass clean after all changes

---

## 12. APPENDIX — DESIGN DECISIONS LOG

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Display typeface | Montserrat | Archivo | Brand guidelines §5 explicitly specifies Montserrat Bold; Archivo was a spec documentation error |
| Error color | #FF5A5F | #FF3D00 (web) / #FF6B6B (mobile) | Spec canonical value; unifies both surfaces |
| Single accent enforcement | CSS variable-based Tailwind tokens | Static hex in tailwind.config.ts | CSS vars respond to dark/light mode; static values do not |
| Web/mobile background unification | Keep separate (#0A0B0D vs #0B0F0E) | Force to single value | 1-step variation imperceptible; changing risks visual regressions |
| Tailwind radius conflict | Keep platform-specific values | Rename to match | Both values are correct for their platform density (web denser) |
| Dashboard accent colors | bg-success/20, bg-brand-primary/20, bg-warning/20 | Keep emerald/purple/amber | Single-accent rule; emerald/amber not remapped to BRAND_SCALE |
| GlassDock top border | colors.border (#242B28) | Keep rgba(200,255,0,0.08) | Volt is retired; no green accent in system |
| Workout execution flow | KEEP (no changes) | Refactor | Already production-quality; changes risk breaking the core product loop |
| Lucide vs custom SVG | Keep platform-separate | Unify to one library | Both already used consistently on their respective surfaces; migration cost outweighs benefit |
| Mobile glow usage | ContinueWorkoutCard only | Broader use | Restraint rule: glow signals maximum importance; use sparingly |
| Landing page approach | Full redesign | Incremental improvements | Stub has no conversion sections; partial improvement would still leave it non-functional |
| Framer Motion for web | Keep (already installed) | Migrate to CSS animations | Already used correctly in DashboardCard; no reason to change |
| Reanimated for mobile | Keep Reanimated 4.x | Mix with RN Animated | Reanimated is already used; mixing creates consistency and performance issues |

---

*End of MR Training Full UX/UI Redesign Specification v1.0*

*This document is the authoritative source for all UI/UX implementation decisions. Any deviation from this spec requires explicit approval and must be documented in the decisions log above.*

---
