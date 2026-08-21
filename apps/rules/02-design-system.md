# MR Training Design System

**Version 1.0 — 2026**

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Layout](#2-layout)
3. [Components](#3-components)
4. [Navigation](#4-navigation)
5. [Data Display](#5-data-display)
6. [Forms](#6-forms)
7. [Dark Mode](#7-dark-mode)
8. [Responsive](#8-responsive)
9. [Animation](#9-animation)
10. [Accessibility](#10-accessibility)

---

## 1. Design Tokens

All visual properties are defined as design tokens — platform-agnostic, single-source-of-truth values surfaced through CSS custom properties. Tokens are hierarchical: primitive tokens define raw values, semantic tokens map primitives to context-aware usage. This enables consistent theming, dark mode switching, and future white-label capabilities without duplicating rules.

### 1.1 Colors

#### Primitive Palette

The color system is built on a dark-first foundation. Surface colors ascend from near-black to mid-gray, establishing depth through luminosity rather than hue variation. Accent colors are intentionally limited to three semantic families plus two brand anchors.

**Surface Hierarchy (Dark Mode — Default)**

| Token | Hex | Luminance | Role |
|---|---|---|---|
| `--color-surface-0` | `#0A0B0D` | 3% | App background, deepest layer |
| `--color-surface-1` | `#0F0F0F` | 6% | Primary surface, main content area |
| `--color-surface-2` | `#141416` | 8% | Elevated surface, sidebar |
| `--color-surface-3` | `#1A1A1C` | 10% | Card background, raised panels |
| `--color-surface-4` | `#1C1C1C` | 11% | Hover state on cards, selected items |
| `--color-surface-5` | `#242426` | 14% | Pressed state, active cards |
| `--color-surface-6` | `#2A2A2C` | 16% | Borders, dividers, subtle separation |

The seven-step surface scale provides discrete elevation states without relying on box shadows alone. The 1–2% incremental luminance differences between adjacent steps produce perceptible but not jarring depth transitions. No single step has a contrast ratio against its neighbor exceeding 1.5:1, ensuring the UI remains cohesive rather than banded.

**Surface Hierarchy (Light Mode — Secondary)**

| Token | Hex | Luminance | Role |
|---|---|---|---|
| `--color-surface-0` | `#F5F5F5` | 96% | App background |
| `--color-surface-1` | `#FFFFFF` | 100% | Primary surface |
| `--color-surface-2` | `#FAFAFA` | 98% | Elevated surface |
| `--color-surface-3` | `#F0F0F0` | 94% | Card background |
| `--color-surface-4` | `#E8E8E8` | 91% | Card hover |
| `--color-surface-5` | `#E0E0E0` | 88% | Pressed state |
| `--color-surface-6` | `#D4D4D4` | 83% | Borders, dividers |

Light mode is a secondary theme. The design system is authored dark-first; all light mode tokens are derived through an inversion mapping that preserves the same relative luminance steps. The light surface scale is the dark scale inverted around 50% luminance, ensuring equivalent perceptual contrast between adjacent surfaces in both themes.

**Brand Accent**

| Token | Hex | Usage |
|---|---|---|
| `--color-brand-primary` | `#C8FF00` | Volt. The single accent. One primary CTA per screen, active states, progress fills. |
| `--color-brand-primary-pressed` | `#A8D900` | Pressed state for Volt elements. |

Volt is the only brand accent. The 90/10 rule governs distribution: ≥ 90% of a
screen comes from neutrals, ≤ 10% from Volt. The former Electric Orange /
Performance Blue dual-accent system is retired (see 01-brand-guidelines.md §4).

**Semantic Colors**

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#34D399` | Success states, completed actions, positive trends |
| `--color-warning` | `#FBBF24` | Warnings, caution states, in-progress indicators |
| `--color-error` | `#FF5A5F` | Errors, destructive actions, critical alerts |

Semantic colors must never appear alone. Every success state includes both the green swatch and a check icon. Every error state includes both the red swatch and an alert icon. Every warning includes both amber and a warning icon. Color is reinforcement, never the sole communication channel.

**Text Colors (Dark Mode — Default)**

| Token | Hex | Role |
|---|---|---|
| `--color-text-primary` | `#F5F5F7` | Primary body text, headlines |
| `--color-text-secondary` | `#9CA3AF` | Secondary text, metadata, captions, placeholders |
| `--color-text-inverse` | `#111214` | Text on Volt accent backgrounds (always Base, never white) |

**Text Colors (Light Mode)**

| Token | Hex | Opacity | Role |
|---|---|---|---|
| `--color-text-primary` | `#0F0F0F` | — | Primary body text |
| `--color-text-secondary` | `#4A4A4A` | — | Secondary text |
| `--color-text-tertiary` | `#8A8A8A` | — | Placeholder text |
| `--color-text-inverse` | `#FFFFFF` | — | Text on dark/accent backgrounds |

#### Color Usage Hierarchy

Colors serve three distinct functions in the interface. The surface hierarchy (levels 0 through 6) establishes spatial depth and containment. Semantic colors (success, warning, error) communicate system state and require icon/text pairing. Brand accents (orange, blue) draw attention to primary actions and interactive elements. This three-layer separation ensures that color is never ambiguous — a blue badge signals information, a blue link signals navigation, and a blue data point signals a secondary data series.

### 1.2 Typography

The type system uses Montserrat for display and Inter for body, as specified in the brand guidelines. The design system formalizes this into a constrained scale with explicit font-size, line-height, letter-spacing, and font-weight tokens for every typographic role.

#### Font Family Tokens

```css
--font-display: 'Montserrat', -apple-system, sans-serif;
--font-body: 'Inter', -apple-system, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

#### Type Scale (Desktop)

All type is set on a modular scale with a ratio of 1.25 (major third), rounded to the nearest integer pixel. This produces a scale that is mathematically harmonious while remaining practical for screen rendering.

| Token | Family | Weight | Size | Line-Height | Letter-Spacing | Usage |
|---|---|---|---|---|---|---|
| `--text-display` | Montserrat | 800 | 48px | 1.1 (53px) | -0.02em | Hero headlines, page titles |
| `--text-h1` | Montserrat | 700 | 36px | 1.2 (43px) | -0.01em | Section headers |
| `--text-h2` | Montserrat | 700 | 28px | 1.25 (35px) | -0.01em | Card titles, panel headers |
| `--text-h3` | Montserrat | 600 | 22px | 1.3 (29px) | 0 | Sub-section headers |
| `--text-h4` | Montserrat | 600 | 18px | 1.35 (24px) | 0 | Minor headers, label groups |
| `--text-body-lg` | Inter | 400 | 18px | 1.6 (29px) | 0 | Long-form body copy |
| `--text-body` | Inter | 400 | 16px | 1.6 (26px) | 0 | Standard body copy |
| `--text-body-sm` | Inter | 400 | 14px | 1.5 (21px) | 0.01em | Secondary body, descriptions |
| `--text-caption` | Inter | 500 | 12px | 1.4 (17px) | 0.02em | Metadata, timestamps, labels |
| `--text-overline` | Montserrat | 500 | 11px | 1.4 (15px) | 0.1em | Section labels (uppercase) |
| `--text-code` | Mono | 400 | 14px | 1.5 (21px) | 0 | Code blocks, data values |

#### Mobile Type Scale

Mobile sizes use the same scale with one step reduction for display through h3, keeping body and code sizes fixed for readability.

| Breakpoint | Display | H1 | H2 | H3 | H4 | Body |
|---|---|---|---|---|---|---|
| Mobile (<768px) | 32px | 28px | 24px | 20px | 16px | 14px |
| Tablet+ (>=768px) | 40px | 32px | 26px | 21px | 17px | 15px |
| Desktop (>=1024px) | 48px | 36px | 28px | 22px | 18px | 16px |

#### Font Weight Scale

```css
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
--weight-extrabold: 800;
```

#### Typography Rules

- Maximum line length for body text: 75 characters. Paragraphs exceeding this width must be constrained with `max-width: 65ch`.
- Headings form a strict hierarchy. Never skip levels (e.g., h2 to h4 without an h3). Every page has exactly one h1.
- All-caps is reserved for overlines and the TRAINING wordmark. Never use all-caps for body copy, even for emphasis.
- Montserrat is never used below 11px. Inter is never used below 12px (mobile) or 14px (desktop) for body copy.
- Text must always be left-aligned. Center alignment is permitted only for short headlines of five words or fewer.
- Monospace is used exclusively for data values (metrics, times, distances, weights), code, and technical identifiers.

### 1.3 Spacing

The spacing system is based on a 4px base unit, providing a linear scale from 4px to 96px. All spacing tokens are defined as multiples of 4, enabling precise visual rhythm and eliminating arbitrary spacing values.

```css
--space-0: 0;
--space-1: 4px;    /* Minimum separation — inline icons, badges */
--space-2: 8px;    /* Tight grouping — form elements, button groups */
--space-3: 12px;   /* Standard compact — card padding (small), list items */
--space-4: 16px;   /* Standard — card padding, section gaps */
--space-5: 20px;   /* Medium — modal padding, panel insets */
--space-6: 24px;   /* Comfortable — page margins, section padding */
--space-7: 32px;   /* Generous — layout gutters, hero padding */
--space-8: 40px;   /* Large — page sections, major separations */
--space-9: 48px;   /* Extra large — header height, hero margins */
--space-10: 64px;  /* Maximum — full-width sections, landing page blocks */
--space-11: 80px;
--space-12: 96px;
```

#### Spacing Application Rules

- Component internal padding: `--space-3` (12px) or `--space-4` (16px)
- Form field vertical rhythm: `--space-5` (20px) between fields
- Card-to-card gutter in grids: `--space-4` (16px) on mobile, `--space-6` (24px) on desktop
- Page content horizontal padding: `--space-6` (24px) default, `--space-8` (40px) on wide viewports
- Sidebar width: multiples of `--space-7` (32px) — 240px, 280px, or 320px
- Modal padding: `--space-6` (24px) horizontal, `--space-5` (20px) vertical
- Button internal padding: `--space-3` (12px) vertical, `--space-5` (20px) horizontal

#### Gap Tokens

In addition to padding-based spacing, gap tokens control flex and grid gaps:

```css
--gap-xs: 4px;     /* Icon + text, inline badges */
--gap-sm: 8px;     /* Tight form row spacing */
--gap-md: 12px;    /* Standard group separation */
--gap-lg: 16px;    /* Component separation */
--gap-xl: 24px;    /* Section separation */
--gap-2xl: 32px;   /* Layout separation */
```

The gap scale and space scale are intentionally offset — gaps are generally tighter than padding, reflecting the perceptual difference between internal spacing (padding) and inter-element spacing (gap). An element's padding defines its breathing room; the gap between elements defines their relationship.

### 1.4 Border Radius

A constrained three-point radius scale prevents inconsistent corner rounding. Every rounded element in the interface must use one of these three values. No exceptions.

```css
--radius-sm: 4px;   /* Inputs, buttons, tags, badges, small cards */
--radius-md: 8px;   /* Cards, modals, panels, dropdowns */
--radius-lg: 12px;  /* Large cards, hero sections, marketing components */
--radius-full: 9999px; /* Pills, avatars, circular badges */
```

The 4px radius is the workhorse — it softens edges without calling attention to itself. The 8px radius appears on elevated surfaces (cards, modals) to visually separate them from the flat background. The 12px radius is rare, reserved for hero-grade marketing components and onboarding flows. Full-radius is for elements that are semantically circular (avatars, status dots, pill-shaped tags).

Progress bars use `--radius-sm` (4px) for both the track and the fill, producing rounded endpoints that align with the overall aesthetic.

### 1.5 Shadows

Shadows define elevation in the dark interface. Unlike light-mode shadows which rely on dark opacity, dark-mode shadows use subtle glow effects — a thin, bright border-top combined with a dark, diffuse spread. This creates the perception of a surface lifting toward a light source above the viewport.

```css
--shadow-none: none;

/* Subtle elevation — cards on surface */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4),
             0 0 0 1px rgba(255, 255, 255, 0.05);

/* Standard elevation — raised panels */
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5),
             0 0 0 1px rgba(255, 255, 255, 0.06),
             0 1px 0 rgba(255, 255, 255, 0.04);

/* High elevation — modals, drawers */
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6),
             0 0 0 1px rgba(255, 255, 255, 0.08),
             0 1px 0 rgba(255, 255, 255, 0.06);

/* Maximum elevation — tooltips, popovers, toasts */
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.7),
             0 0 0 1px rgba(255, 255, 255, 0.1),
             0 2px 0 rgba(255, 255, 255, 0.05);

/* Focus ring glow — Electric Orange */
--shadow-focus-orange: 0 0 0 2px rgba(255, 107, 0, 0.4);

/* Focus ring glow — Performance Blue */
--shadow-focus-blue: 0 0 0 2px rgba(0, 102, 255, 0.4);
```

In light mode, shadow tokens invert: dark opacity layers give way to traditional light-mode drop shadows with larger blur radii and lower opacity values.

**Elevation-to-Surface Mapping**

| Elevation | Shadow | Surface Token | Example |
|---|---|---|---|
| 0 (base) | `--shadow-none` | `--color-surface-0` | App background |
| 1 (raised) | `--shadow-sm` | `--color-surface-2` | Sidebar |
| 2 (elevated) | `--shadow-md` | `--color-surface-3` | Cards |
| 3 (overlay) | `--shadow-lg` | `--color-surface-1` | Modals, dialogs |
| 4 (floating) | `--shadow-xl` | `--color-surface-1` | Tooltips, dropdowns |

### 1.6 Z-Index Scale

A fixed z-index scale prevents stacking context chaos. Every layer has a defined position, and components are assigned to a layer, never an arbitrary value.

```css
--z-base: 0;            /* Default document flow */
--z-dropdown: 100;       /* Dropdown menus, select options */
--z-sticky: 200;         /* Sticky headers, sticky table columns */
--z-sidebar: 300;        /* Fixed sidebars */
--z-overlay: 400;        /* Modal backdrops, drawer overlays */
--z-modal: 500;          /* Modals, dialogs */
--z-popover: 600;        /* Tooltips, popovers */
--z-toast: 700;          /* Toast notifications */
--z-tooltip: 800;        /* Highest — always visible above everything */
```

The 100-point gap between each layer provides ample room for sub-layering within a component family (e.g., nested dropdowns at 110, 120) without collision. Components within the same layer may use increments of 1 when relative ordering is required (e.g., `--z-dropdown + 1` for a cascading sub-menu).

---

## 2. Layout

### 2.1 Grid System

MR Training uses a 12-column fluid grid. Columns are flexible — they grow proportionally with the viewport — while gutters remain fixed. This hybrid approach keeps spatial relationships predictable as the viewport scales.

```css
.container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: var(--space-6); /* 24px */
  row-gap: var(--space-6);
}
```

#### Column Span Reference

| Span | Width (1024px container) | Width (1280px container) | Typical Use |
|---|---|---|---|
| 1 | 60px | 80px | Utility columns, narrow metadata |
| 2 | 144px | 184px | Sidebar filters, icon columns |
| 3 | 228px | 288px | Metric cards (4-up layout) |
| 4 | 312px | 392px | Metric cards (3-up layout), narrow panels |
| 6 | 492px | 612px | Half-width sections, form columns |
| 8 | 672px | 832px | Main content area (with sidebar) |
| 12 | 1032px | 1272px | Full-width content, hero sections |

Columns are calculated as `(container-width - 11 * gutter) / 12`. At 1024px container with 24px gutters, each column is `(1024 - 264) / 12 = 63.3px`. Slight rounding differences are absorbed by the grid's fluid nature.

#### Grid Nesting

Child grids inherit the parent's column count but reset the gap. Nested grids should use `--space-4` (16px) gutters and `--space-4` (16px) row gaps. No more than two levels of grid nesting are permitted — deeper nesting indicates the layout should be decomposed into smaller components.

#### Content Alignment

Grid items default to `stretch` for both axes. Override with:

- `align-self: start` — Content anchored to the top (forms, lists, feeds)
- `align-self: center` — Vertically centered cards (hero sections, empty states)
- `justify-self: center` — Centered within column (metric values, action buttons)

### 2.2 Breakpoints

Four breakpoints govern responsive behavior. All breakpoints are `min-width` based — designs start at the smallest screen and layer on complexity as space becomes available. Mobile-first is not negotiable.

| Name | Width | Target Device |
|---|---|---|
| `xs` | 320px | Small phones (iPhone SE, older Android) |
| `sm` | 640px | Large phones in landscape, small tablets |
| `md` | 768px | Tablets (iPad portrait), small laptops |
| `lg` | 1024px | Desktops, laptops, tablets in landscape |
| `xl` | 1280px | Wide desktops, external monitors |

```css
/* Breakpoint as CSS custom properties (for JS consumption) */
--bp-xs: 320px;
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

#### Breakpoint Strategy

- **320–639px**: Single-column layout. Stacked cards, collapsed sidebar (hamburger menu), full-width forms, reduced type scale. Bottom navigation replaces sidebar.
- **640–767px**: Transitional. Two-column grid where sensible. Sidebar becomes a slide-out drawer. Metric cards display 2-across. Type scale increases one step.
- **768–1023px**: Tablet layout. Persistent sidebar (collapsed to icons only at 768, icon+label at 900+). Two-column content grid. Full metric card layouts.
- **1024–1279px**: Desktop layout. Full sidebar with labels. Three-column content where applicable. Data tables with all columns visible.
- **1280px+**: Wide layout. 1280px max-width container with auto margins. Additional whitespace. Larger type scale (display 48px). Multi-panel dashboards.

Breakpoints are used only for layout changes. Never use breakpoints to fix broken layouts — if a component breaks between 768px and 900px, the component's internal layout logic is the problem, not the breakpoint definitions.

### 2.3 Container Widths

```css
--container-sm: 640px;   /* Narrow content — forms, focused reading */
--container-md: 768px;   /* Medium content — single-panel views */
--container-lg: 1024px;  /* Standard — dashboards with sidebar */
--container-xl: 1280px;  /* Maximum — data-heavy dashboards, wide tables */
```

The 1280px maximum width is the ceiling. Beyond 1280px, content centers with auto margins and the background color (`--color-surface-0`) fills the remaining viewport. This prevents layout from stretching indefinitely on ultrawide monitors while still using the available horizontal space efficiently.

### 2.4 Page Structure

Every page in MR Training follows a consistent structural template:

```
+----------------------------------------------------------+
|  Top Bar (56px height, fixed, --z-sticky)                 |
+------+---------------------------------------------------+
|      |                                                    |
| SBR  |  Page Content                                      |
| (240)|  (grid-based, max-width --container-xl,            |
|      |   center-aligned, padded --space-6)                |
|      |                                                    |
+------+---------------------------------------------------+
```

- **Top Bar**: 56px height, full width, fixed position, contains logo, global search, notifications, and user menu.
- **Sidebar**: 240px width (collapsed to 64px icon-only on tablets), fixed position, contains primary navigation, workspace switcher, and bottom actions (settings, help).
- **Content Area**: Offset by sidebar width (240px or 64px depending on breakpoint), padded with `--space-6`, scrolls independently.

On mobile, the sidebar becomes a slide-out drawer triggered by a hamburger button in the top bar. The top bar remains fixed. Content fills the full viewport width.

---

## 3. Components

Every component is defined by its anatomy (internal structure), variants (visual/functional modes), states (interaction lifecycle), and API (props). Components are never one-off; if a component is built, it must serve at least two distinct use cases.

### 3.1 Button

Buttons are the primary action mechanism. Three variants express action hierarchy; five states cover the interaction lifecycle.

#### Anatomy

```
+--[icon (optional)]--+--[label text]--+--[icon (optional)]--+
|                     |                 |                      |
+---------------------+-----------------+----------------------+
                       padding: 12px 20px
                       min-height: 44px
                       border-radius: --radius-sm (4px)
```

#### Variants

| Variant | Background | Text Color | Border | Usage |
|---|---|---|---|---|
| `primary` | `--color-brand-primary` | `--color-text-inverse` (#0F0F0F) | none | Primary action per view. One per screen. |
| `secondary` | transparent | `--color-text-primary` | 1px `--color-surface-6` | Secondary actions, paired with primary. |
| `ghost` | transparent | `--color-text-secondary` | none | Tertiary actions, icon buttons, toolbar actions. |

**Destructive variant**: A modifier applied to `secondary` or `ghost` that replaces the text/border color with `--color-error`. Destructive buttons require a confirmation step for data-loss actions (deletion, removal, cancellation of paid subscriptions).

#### States

| State | Primary | Secondary | Ghost |
|---|---|---|---|
| `default` | `#FF6B00` bg | transparent, gray border | transparent |
| `hover` | `#E85D00` (10% darker) | `--color-surface-4` bg | `--color-surface-3` bg |
| `active` | `#CC5200` (20% darker) | `--color-surface-5` bg | `--color-surface-4` bg |
| `focus` | Same as default + `--shadow-focus-orange` | Same as default + `--shadow-focus-blue` | Same as default + `--shadow-focus-blue` |
| `disabled` | `--color-surface-5` bg, `--color-text-tertiary` text | `--color-text-tertiary` text, border `--color-surface-4` | `--color-text-tertiary` text |
| `loading` | Replaced with 16px spinner, label hidden | Replaced with 16px spinner, label hidden | Replaced with 16px spinner |

**Key rules:**
- Every view contains exactly one primary button. If a view appears to need two, the lower-priority action should be downgraded to secondary.
- Ghost buttons must have a minimum 44x44px touch target.
- Loading state replaces the button content with a centered spinner; the button retains its width to prevent layout shift.
- Disabled buttons are never used as a teaching mechanism. If a button cannot be clicked, explain why nearby (e.g., "Fill in all required fields to continue").

#### Sizes

| Size | Height | Padding | Font Size | Usage |
|---|---|---|---|---|
| `sm` | 32px | 8px 12px | `--text-caption` (12px) | Table actions, inline actions |
| `md` | 40px | 10px 16px | `--text-body-sm` (14px) | Standard buttons, forms |
| `lg` | 48px | 12px 24px | `--text-body` (16px) | Primary CTAs, hero sections |

#### Button Groups

When two or more buttons are adjacent, they are wrapped in a button group with `--gap-sm` (8px) separation. Button groups align to the end of their container (forms, modals, cards). In full-width contexts (mobile forms), buttons stack vertically and fill the container width.

### 3.2 Input

Text inputs, textareas, selects, and search fields share a common input shell.

#### Anatomy

```
+--------------------------------------------------+
| [leading icon]  [input text]  [trailing icon]     |  height: 44px
+--------------------------------------------------+  padding: 0 12px
  label                                            |  border-radius: --radius-sm (4px)
```

#### Variants

| Variant | Background | Border | Usage |
|---|---|---|---|
| `default` | `--color-surface-2` | 1px `--color-surface-6` | Standard form fields |
| `filled` | `--color-surface-3` | none | Search bars, filter inputs |
| `ghost` | transparent | none | Inline editing, table cell editing |

#### States

| State | Visual |
|---|---|
| `default` | Gray border (`--color-surface-6`), dark surface background |
| `hover` | Border brightens to `--color-text-tertiary` (#8A8A8A) |
| `focus` | Border `--color-brand-secondary`, `--shadow-focus-blue` (2px ring) |
| `error` | Border `--color-error`, `--shadow-focus-orange` (substituting orange for error red) |
| `disabled` | Background `--color-surface-1`, text `--color-text-tertiary`, no interaction |
| `read-only` | No border, transparent background, `--color-text-primary` text |

#### Labels and Helper Text

```
Label (--text-body-sm, --weight-medium, --color-text-primary)
  └── Required indicator (*) in --color-error if mandatory
[Input element]
  └── Helper text (--text-caption, --color-text-tertiary, 4px below input)
  └── Error text (--text-caption, --color-error, 4px below input, with error icon)
```

Labels sit 8px above the input. They are always visible — never use placeholder-as-label patterns. Floating labels are permitted only in extremely space-constrained mobile contexts and must transition to static labels above the input on focus.

#### Textarea

Extends input with a minimum height of 96px (3 lines at 16px body text) and vertical resize only. Maximum height is 240px (approximately 10 lines), after which the textarea scrolls internally.

#### Select

Dropdown select reuses the input shell with a chevron-down icon in the trailing position. The dropdown menu is a `--shadow-xl` popover with `--radius-md` (8px), maximum height of 320px (approximately 7 options visible), and internal scrolling. Selected option is highlighted with `--color-surface-4` background and Electric Orange left-border accent.

### 3.3 Card

Cards are the primary content container. Every piece of distinct information in the interface lives in a card.

#### Anatomy

```
+--------------------------------------------------+
| [Header: icon + title + actions]                   |  padding: --space-4 (16px)
+--------------------------------------------------+
|                                                     |
| [Content: free-form, any component]                 |
|                                                     |
+--------------------------------------------------+
| [Footer: metadata, secondary actions]               |  padding: --space-3 (12px)
+--------------------------------------------------+
```

#### Variants

| Variant | Background | Shadow | Border |
|---|---|---|---|
| `default` | `--color-surface-3` | `--shadow-sm` | none |
| `elevated` | `--color-surface-3` | `--shadow-md` | none |
| `outlined` | transparent | none | 1px `--color-surface-6` |
| `interactive` (hover) | `--color-surface-4` | `--shadow-md` | none |

**Interactive cards** — cards functioning as navigation targets or expandable elements — gain a hover state (surface lightens, shadow deepens) and a 2px Performance Blue focus ring. The entire card surface is clickable via a stretched link overlay.

#### Card Sizes

| Size | Padding | Typical Use |
|---|---|---|
| `compact` | 12px | Metric cards, list items, dense data |
| `default` | 16px | Standard content cards |
| `spacious` | 24px | Dashboard hero cards, onboarding cards |

#### Card Grid

Cards in a grid use `--gap-lg` (16px) on mobile and `--gap-xl` (24px) on desktop. Cards in a grid are always equal height within their row, with content aligned to the top and footers pinned to the bottom.

### 3.4 Modal

Modals interrupt the user for focused tasks: confirmations, forms, detail views, and workflows that require undivided attention.

#### Anatomy

```
  [Backdrop: rgba(0,0,0,0.6), full viewport, --z-overlay]
  +------------------------------------------+
  | [Header: title + close button]            |  padding: --space-5 (20px)
  +------------------------------------------+
  |                                            |
  | [Body: scrollable content]                 |  padding: --space-6 (24px)
  |                                            |
  +------------------------------------------+
  | [Footer: primary + secondary actions]      |  padding: --space-4 (16px)
  +------------------------------------------+
  border-radius: --radius-md (8px)
  max-width: 520px (default), 720px (large)
  max-height: 85vh
```

#### Sizes

| Size | Width | Usage |
|---|---|---|
| `sm` | 400px | Confirmations, alerts, simple forms |
| `md` | 520px | Standard modals, detail views |
| `lg` | 720px | Complex forms, multi-step workflows, data tables |
| `full` | 100vw - 64px | Full-screen workflows, onboarding flows |

On mobile (<768px), all modals become `full` — covering the viewport with a 16px margin on all sides, transforming into a bottom sheet that slides up from the bottom edge. Close is triggered by a top-right X button or a swipe-down gesture on the sheet handle.

#### States

| State | Behavior |
|---|---|
| `entering` | Fade backdrop in (200ms) + scale-up body from 0.95 to 1 (300ms spring curve) |
| `open` | Static, content scrollable if exceeding max-height |
| `exiting` | Fade backdrop out (200ms) + scale-down body (200ms exit curve) |
| `closed` | Removed from DOM (after animation completes) |

#### Behavior Rules

- Only one modal may be open at a time. Attempting to open a second modal while one is open closes the first.
- Clicking the backdrop closes the modal — unless the modal contains unsaved changes, in which case a confirmation dialog appears.
- Escape key closes the modal.
- Focus is trapped within the modal: Tab cycles through interactive elements, Shift+Tab cycles backward. Focus returns to the trigger element on close.
- Scroll position behind the modal is preserved (body scroll is locked via `overflow: hidden` and `position: fixed` on the body element).

### 3.5 Toast

Toasts communicate transient system feedback at the top-right of the viewport, above all other content (`--z-toast: 700`).

#### Anatomy

```
+--------------------------------------------------+
| [icon]  [message text]          [action] [close]  |
+--------------------------------------------------+
  padding: 12px 16px
  border-radius: --radius-md (8px)
  max-width: 400px
  min-height: 48px
```

#### Variants

| Variant | Icon | Accent Color | Usage |
|---|---|---|---|
| `success` | Check circle | `--color-success` | Operations completed successfully |
| `error` | Alert triangle | `--color-error` | Operations failed |
| `warning` | Warning triangle | `--color-warning` | Non-blocking issues |
| `info` | Info circle | `--color-info` | Neutral information |
| `loading` | Spinner | `--color-brand-secondary` | Async operations in progress |

#### Behavior

- Toasts auto-dismiss after 5 seconds (6 seconds for longer messages).
- `loading` toasts persist until the async operation resolves or fails, at which point they transition to `success` or `error`.
- Maximum 3 toasts visible simultaneously. Additional toasts are queued and displayed in FIFO order.
- Toasts include an optional action link (e.g., "Undo," "View," "Retry").
- Close button (X icon) is always present.

### 3.6 Badge

Badges communicate status, category, or count in a compact inline element.

#### Anatomy

```
+------------------+
| [icon] LABEL      |  height: 24px
+------------------+  padding: 2px 8px
   border-radius: --radius-full (pill)
```

#### Variants

| Variant | Background | Text Color | Usage |
|---|---|---|---|
| `default` | `--color-surface-4` | `--color-text-secondary` | Neutral tags, categories |
| `brand` | `rgba(255, 107, 0, 0.15)` | `--color-brand-primary` | Featured, premium, highlighted |
| `success` | `rgba(0, 200, 83, 0.15)` | `--color-success` | Active, completed, paid |
| `warning` | `rgba(255, 179, 0, 0.15)` | `--color-warning` | Pending, in-review |
| `error` | `rgba(255, 61, 0, 0.15)` | `--color-error` | Failed, overdue, cancelled |
| `info` | `rgba(0, 102, 255, 0.15)` | `--color-brand-secondary` | Informational |

All badge backgrounds are the accent color at 15% opacity, ensuring legibility on dark surfaces while maintaining semantic color association.

#### Sizes

| Size | Height | Font | Usage |
|---|---|---|---|
| `sm` | 20px | `--text-overline` (11px) | Table cells, inline with text |
| `md` | 24px | `--text-caption` (12px) | Standard badges |
| `lg` | 28px | `--text-body-sm` (14px) | Card headers, filter chips |

#### Count Badge

A numeric variant used for notification counts and unread indicators. Count badges are always `--color-brand-primary` background with `--color-text-inverse` text. Maximum displayed value is "99+" — counts exceeding 99 are truncated.

### 3.7 Avatar

Avatars represent users, athletes, coaches, and organizations.

#### Variants

| Variant | Rendering | Usage |
|---|---|---|
| `image` | User photograph | Standard user representation |
| `initials` | First two initials on `--color-brand-primary` bg | Fallback when no image available |
| `icon` | Person icon on `--color-surface-4` bg | Generic placeholder |
| `organization` | Organization logo | Academy, club, or team representation |

#### Sizes

| Size | Dimensions | Font Size | Usage |
|---|---|---|---|
| `xs` | 20px | 8px | Table rows, inline lists |
| `sm` | 28px | 11px | Comment threads, activity feeds |
| `md` | 36px | 14px | List items, card headers |
| `lg` | 48px | 18px | Profile headers, detail pages |
| `xl` | 72px | 28px | Profile pages, settings |
| `2xl` | 96px | 36px | Onboarding, team pages |

All avatars are circular (`--radius-full`). Image avatars include a 1px `--color-surface-6` border. Avatars with `initials` fallback auto-generate initials from the user's first and last name, with a deterministic background color derived from the user ID (hashing the ID to select from a palette of 8 distinct hues, all at 80% saturation and 30% lightness on dark backgrounds).

#### Avatar Groups

When displaying multiple avatars together (e.g., athlete roster, group members), avatars overlap with a -8px margin between adjacent avatars, creating a stacked effect. A "+N" overflow badge terminates the group. Maximum 5 avatars displayed before overflow collapse.

### 3.8 Progress Bar

Progress bars communicate completion, capacity, or loading state.

#### Anatomy

```
[████████████████░░░░░░░░░░░░░░░░░░░░]   height: 4px
 ^^^^ fill                            ^^^^ track
 track: --color-surface-5 bg, --radius-sm
 fill: --color-brand-primary bg (default), --radius-sm
```

#### Variants (Fill Color)

| Variant | Fill Color | Usage |
|---|---|---|
| `default` | `--color-brand-primary` | General progress |
| `success` | `--color-success` | Completion, achievement |
| `warning` | `--color-warning` | Approaching limit |
| `error` | `--color-error` | Critical threshold exceeded |

#### Sizes

| Size | Height | Usage |
|---|---|---|
| `sm` | 2px | Inline within text, table cells |
| `md` | 4px | Standard progress indicators |
| `lg` | 8px | Dashboard widgets, hero stats |

#### States

- **Indeterminate**: Animated shimmer effect — a 60px-wide gradient stripe oscillating horizontally over 1.5s. Used for unknown durations (loading states, data fetching).
- **Determinate**: Static fill with numeric label (% or fraction). Used for known quantities (workout completion, profile setup, onboarding steps).
- **Completed**: Full-width fill with success color and a check icon at the end.

#### Label

Progress bars always display a numeric label unless the bar is `sm` size or indeterminate. Label format: percentage (e.g., "68%") or fraction (e.g., "4/6"). The label sits to the right of the bar at `--text-caption` size, `--color-text-secondary`.

### 3.9 Tabs

Tabs organize content into mutually exclusive views within a single context.

#### Anatomy

```
+-------+--------+--------+-------+
| Tab 1 | Tab 2  | Tab 3  | Tab 4 |
+-------+--------+--------+-------+
  ────────────────────────────────  divider: 1px --color-surface-6
```

#### Variants

| Variant | Active Indicator | Usage |
|---|---|---|
| `underline` | 2px underline (`--color-brand-primary`) | Standard page-level tabs |
| `pill` | Filled pill background (`--color-surface-5`) | Filter toggles, segment controls |
| `card` | Card-level tabs (tab content inside card) | Dashboard widgets |

#### States

| State | Visual |
|---|---|
| `default` | `--color-text-secondary` text, no indicator |
| `hover` | `--color-text-primary` text |
| `active` | `--color-text-primary` text, `--weight-semibold`, indicator (underline or pill bg) |
| `focus` | `--shadow-focus-blue` on the tab element |

#### Scrollable Tabs

When tabs exceed the container width, the tab bar becomes horizontally scrollable with gradient fade indicators at the left and right edges. Arrow buttons appear to scroll one tab width at a time.

#### Mobile Tabs

On mobile (<640px), tabs with more than 3 items collapse into a dropdown labeled with the active tab name and a chevron icon. Tabs with 3 or fewer items remain as a full-width, equally-distributed row.

### 3.10 Dropdown

Dropdowns present a list of actions or options in a floating popover.

#### Anatomy

```
Trigger: Button, input, or icon
  └── Dropdown panel:
      +----------------------------------+
      | [Search (optional)]              |
      +----------------------------------+
      |  Option 1                        |
      |  Option 2  [check/shortcut]      |
      |  ───────── (divider)             |
      |  Option 3  [danger]              |
      +----------------------------------+
      background: --color-surface-1
      border: 1px --color-surface-6
      border-radius: --radius-md (8px)
      box-shadow: --shadow-xl
      min-width: 180px
      max-width: 320px
      max-height: 320px (scrollable)
```

#### Item States

| State | Visual |
|---|---|
| `default` | Transparent background, `--color-text-primary` text |
| `hover` | `--color-surface-3` background |
| `active` | `--color-surface-4` background |
| `selected` | `--color-surface-4` background, Electric Orange left-border (2px), check icon right |
| `disabled` | `--color-text-tertiary` text, no hover/click |
| `danger` | `--color-error` text, red background on hover |

#### Behavior

- Opens on click (not hover). Closes on click outside, Escape key, or item selection.
- Focus is managed: focus moves into the dropdown on open, Tab cycles through items, first item is focused by default.
- Dropdowns auto-position: default is below and aligned to the left edge of the trigger. If insufficient space below, opens above. If insufficient space to the right, aligns to the right edge.
- Sub-menus open on hover with a 200ms delay (prevents accidental triggers) and position to the right of the parent item.

### 3.11 Table

Tables present structured, comparable data sets — athlete rosters, workout logs, payment histories, leaderboards.

#### Anatomy

```
+--------------------------------------------------+
| [Toolbar: title, search, filters, actions]         |
+------+----------+----------+----------+-----------+
|  #   | Name     | Status   | Progress | Actions   |  ← header row
+------+----------+----------+----------+-----------+  sticky on scroll
|  1   | Alex Kim | Active   | 68%      | [•••]     |  ← data row, --space-3 py
+------+----------+----------+----------+-----------+
|  2   | Sam Lee  | Paused   | 42%      | [•••]     |
+------+----------+----------+----------+-----------+
| Pagination                                         |
+--------------------------------------------------+
```

#### Table Styles

| Variant | Usage |
|---|---|
| `default` | Standard data tables with borders |
| `striped` | Alternating row backgrounds (`--color-surface-3` / `--color-surface-2`) for dense data |
| `borderless` | No internal borders, used for simpler layouts |

#### Column Alignment Rules

| Data Type | Alignment |
|---|---|
| Text, names, descriptions | Left |
| Numbers, metrics, currencies | Right |
| Status badges, icons, checkboxes | Center |
| Actions (buttons, menus) | Right |
| Dates, timestamps | Left |

#### States

| State | Visual |
|---|---|
| `default` | Standard row |
| `hover` | `--color-surface-4` background on hover |
| `selected` | `--color-surface-4` background + 2px Electric Orange left border on the row |
| `sorted` | Column header shows sort direction arrow (ascending or descending), `--color-brand-primary` |
| `empty` | Empty state component (see 3.13) |
| `loading` | Skeleton rows (see 3.12) |

#### Features

- **Sticky header**: Table header row remains fixed at the top of the scroll container.
- **Resizable columns**: Drag column borders to resize (8px minimum width).
- **Sortable columns**: Click column header to sort. Shift+click for multi-column sort.
- **Selectable rows**: Checkbox column for batch operations (delete, export, assign).
- **Pagination**: Below the table: "Showing 1–25 of 142" with page navigation. Page size options: 25 (default), 50, 100.

#### Mobile Table

On mobile (<768px), tables transform into stacked card layouts. Each row becomes a card with label-value pairs. Column headers become labels. The first column (typically the identifier) becomes the card title.

### 3.12 Skeleton

Skeleton screens provide perceived performance during loading. They replace content areas with animated placeholder shapes that mirror the eventual layout.

#### Anatomy

```
+------------------------------------------+
| [━━━━━━━━━━━━━━]  [━━━━]                  |  ← header skeleton
+------------------------------------------+
| [━━━━━━━━━]                               |  ← text line
| [━━━━━━━━━━━━━━━━]                        |  ← text line
| [━━━━━━]                                  |  ← text line (60% width)
+------------------------------------------+
```

#### Element Types

| Element | Shape | Usage |
|---|---|---|
| `text` | Rounded rectangle, 12px height | Body text lines |
| `heading` | Rounded rectangle, 20px height | Headlines |
| `avatar` | Circle, 36px diameter | User avatars |
| `card` | Rounded rectangle, 100% width | Card placeholders |
| `button` | Rounded rectangle, 40px height | Button placeholders |
| `metric` | Rounded rectangle, 28px height | Metric values |

All skeleton elements use `--color-surface-4` background with a shimmer animation: a linear gradient (transparent → `rgba(255,255,255,0.05)` → transparent) sweeping left-to-right over 1.5s, repeating infinitely.

#### Usage Rules

- Skeleton layouts must exactly match the final content layout. No generic placeholders.
- The shimmer animation respects `prefers-reduced-motion` — when reduced motion is active, skeletons display as static shapes without animation.
- Skeletons are replaced with real content via a 200ms crossfade.

### 3.13 Empty State

Empty states appear when a view has no data to display — no workouts logged, no athletes assigned, no messages received. They are never an afterthought.

#### Anatomy

```
+------------------------------------------+
|                                            |
|            [Illustration/Icon]              |  64px, --color-text-tertiary
|                                            |
|         No workouts logged yet              |  --text-h3, --weight-semibold
|                                            |
|  Start your first session and track your    |  --text-body, --color-text-secondary
|  progress toward your goals.                |  max-width: 400px, centered
|                                            |
|         [   Start First Workout   ]         |  primary button
|                                            |
+------------------------------------------+
```

#### Structure

1. **Illustration or icon** (64px, `--color-text-tertiary` opacity). Must be relevant to the content type — a dumbbell for workouts, an apple for nutrition, a bed for recovery.
2. **Headline** (`--text-h3`, `--color-text-primary`). States what is (or isn't) happening. Active voice, no negation fatigue ("No workouts logged yet" not "You don't have any workouts").
3. **Description** (`--text-body`, `--color-text-secondary`, max-width 400px). Explains the value of filling the empty state and contextualizes the action.
4. **Primary CTA** (optional). The action that populates the view. Present in 90% of empty states; omitted only when populating the view requires an action the user cannot take (e.g., waiting for a coach to assign a program).

#### Design Principles

- Never blame the user. "No data available" suggests the system is lacking; "You haven't created any workouts yet" blames the user. Use neutral, encouraging language.
- Never leave an empty state without a path forward. Every empty state should lead the user toward the action that fills it.
- Empty states are vertically and horizontally centered in their container.
- Maximum text width is 400px to maintain readability.

---

## 4. Navigation

Navigation is the skeleton of the application. It must be consistent, predictable, and never the source of confusion.

### 4.1 Sidebar

The sidebar is the primary navigation mechanism. Persistent on desktop, collapsible on tablet, drawer on mobile.

#### Anatomy

```
+-----------------------------------+
| [Logo: MR Monogram + TRAINING]     |  height: 56px (matches top bar)
+-----------------------------------+
| Workspace Switcher                 |
|   Academy: Elite Performance ▼    |  dropdown to switch context
+-----------------------------------+
| ───────────────────────────────── |
|                                    |
|  [icon] Dashboard                  |  nav item, --space-3 padding
|  [icon] Athletes                   |
|  [icon] Training                   |
|  [icon] Nutrition                  |
|  [icon] Analytics                  |
|  [icon] Events                     |
|                                    |
| ───────────────────────────────── |
|  [icon] Settings                   |  bottom section
|  [icon] Help                       |
+-----------------------------------+
  width: 240px
  background: --color-surface-2
  border-right: 1px --color-surface-6
```

#### Navigation Item States

| State | Visual |
|---|---|
| `default` | `--color-text-secondary` text, transparent background |
| `hover` | `--color-surface-4` background, `--color-text-primary` text |
| `active` | `--color-surface-4` background, `--color-brand-primary` text, 2px Electric Orange left border |
| `expanded` | Parent item with children visible, chevron rotated 90° |

Active items include a 2px Electric Orange left-border accent that spans the full height of the item. This provides a strong positional indicator that works even when the sidebar is collapsed to icons only.

#### Collapsed State

At 768px–900px viewports, the sidebar collapses to 64px width, showing icons only. Icon tooltips appear on hover with the full item name. The workspace switcher becomes a single icon. At viewports below 768px, the sidebar transforms into a slide-out drawer triggered by the hamburger menu in the top bar.

#### Workspace Switcher

A dropdown at the top of the sidebar allows users to switch between workspaces — their personal coaching account, any academies they administer, and any clubs they manage. The active workspace determines which athletes, programs, and data are visible. Switching workspaces reloads the current view in the new context.

### 4.2 Top Bar

```
+----------------------------------------------+
| [☰] [Logo]  [Global Search...]    [🔔] [👤] |
+----------------------------------------------+
  height: 56px
  background: --color-surface-1
  border-bottom: 1px --color-surface-6
  position: fixed, top: 0, left: 0, right: 0
  z-index: --z-sticky
```

#### Elements

- **Hamburger menu** (mobile/tablet only): Toggles the sidebar drawer.
- **Logo**: MR monogram only on collapsed sidebar viewports; full logo otherwise.
- **Global search**: Command+K (macOS) / Ctrl+K (Windows) opens a command palette with fuzzy search across athletes, programs, workouts, events, and settings. Results appear in a dropdown panel.
- **Notification bell**: Badge with unread count. Clicking opens a notification panel (slide-in from right, 380px width).
- **User menu**: Avatar + name or avatar only. Dropdown with profile, settings, billing, and logout.

### 4.3 Breadcrumbs

Breadcrumbs provide location context and sibling navigation within deep page hierarchies.

```
Athletes / Elite Performance / Alex Kim / Performance Dashboard
```

- Separators use a forward slash ("/") in `--color-text-tertiary`.
- The current page is the last item, rendered in `--color-text-primary`, not clickable.
- Parent segments are `--color-text-secondary` and link to their respective pages.
- The first segment is always the root context (workspace name or "Home").
- Breadcrumbs collapse on mobile to show only the current page with a "..." back button for the parent.
- Maximum 5 segments visible. Deeper hierarchies use a collapsed "..." dropdown between the first and last two segments.

### 4.4 Mobile Navigation

On viewports below 768px:

**Top Bar**: Full width, fixed. Contains hamburger, logo (monogram only), and essential actions (search, notifications, user). Simplified to preserve horizontal space.

**Bottom Navigation Bar** (replaces sidebar for primary navigation):

```
+-------------+-------------+-------------+-------------+
|   [icon]    |   [icon]    |   [icon]    |   [icon]    |
|   Home      |  Training   |  Athletes   |  Profile    |
+-------------+-------------+-------------+-------------+
  height: 56px (+ safe area inset on notched devices)
  background: --color-surface-2
  border-top: 1px --color-surface-6
  position: fixed, bottom: 0
```

Maximum 5 items in the bottom bar. Items use a 24px stroke icon with a 10px label in `--text-overline` style. Active items are Electric Orange. The bar respects `env(safe-area-inset-bottom)` on devices with home indicators.

**Drawer Navigation**: The hamburger menu opens a full-height slide-in drawer from the left edge, containing the complete sidebar navigation tree. The drawer overlays content with a semi-transparent backdrop. Swipe-right-to-go-back gesture closes the drawer. The drawer is 280px wide and scrolls independently.

**Tab Bar Alternative**: For views with heavy tab-based navigation (e.g., athlete profile with tabs for Training, Nutrition, Recovery, Analytics), a horizontally scrollable tab bar replaces the bottom navigation bar. The bottom bar returns when the user navigates away from the tabbed section.

---

## 5. Data Display

Data is the product. Every data point must be accurate, contextual, and actionable.

### 5.1 Metric Cards

Metric cards are the primary dashboard unit — a single value with supporting context.

#### Anatomy

```
+----------------------------+
| Weekly Training Load        |  header: --text-caption, --color-text-secondary
|                             |
| 1,842                        |  value: --text-display, --weight-extrabold
| TSS                          |  unit: --text-caption, --color-text-secondary
|                             |
| ▁▂▃▄▃▅▆                     |  sparkline (optional)
|                             |
| +12% vs. last week          |  trend: --text-caption, success/warning/error color
+----------------------------+
  padding: --space-4 (16px)
  background: --color-surface-3
  border-radius: --radius-md (8px)
```

#### Trend Indicators

| Direction | Color | Icon | Meaning |
|---|---|---|---|
| Positive | `--color-success` | Arrow up | Improvement (more is better: revenue, adherence, performance) |
| Negative | `--color-error` | Arrow down | Decline (less is worse: revenue, adherence, performance) |
| Positive (inverse) | `--color-success` | Arrow down | Improvement (less is better: injury rate, churn) |
| Negative (inverse) | `--color-error` | Arrow up | Decline (more is worse: injury rate, churn) |
| Neutral | `--color-text-tertiary` | Dash | No significant change |

Trends always include a comparison period: "vs. last week," "vs. previous month," "vs. same period last year."

#### Sparklines

Optional inline charts (120px wide, 40px tall) that provide 7-day or 30-day trends at a glance. Sparklines use a 2px stroke in the metric's accent color, with a 10% opacity fill below the line. The current data point is highlighted with a 4px dot. No axes, no labels — sparklines convey shape, not precision. They are visual texture that rewards the curious eye without demanding attention.

### 5.2 Charts

Charts visualize trends, distributions, comparisons, and relationships. Every chart must serve an analytical question; decorative charts have no place in the interface.

#### Chart Types

| Type | Usage | Example |
|---|---|---|
| **Line chart** | Trends over time (workout volume, adherence rate, revenue) | "How has Alex's training load trended this month?" |
| **Bar chart** | Category comparison (sport performance, program completion) | "Which programs have the highest completion rate?" |
| **Area chart** | Volume over time with magnitude emphasis | "Total training minutes across the team this quarter" |
| **Donut chart** | Part-to-whole relationships (workout type distribution) | "How is training time distributed across sports?" |
| **Heatmap** | Distribution and density (session timing, load patterns) | "What days and times have the highest training load?" |

#### Chart Colors

| Role | Color |
|---|---|
| Primary series | `--color-brand-primary` (#FF6B00) |
| Secondary series | `--color-brand-secondary` (#0066FF) |
| Tertiary series | `--color-success` (#00C853) |
| Quaternary series | `--color-warning` (#FFB300) |
| Grid lines | `--color-surface-6` opacity 0.5 |
| Axes | `--color-text-tertiary` |
| Tooltip background | `--color-surface-1`, `--shadow-xl` |

#### Chart Styling

- Line charts: 2px stroke, smooth interpolation (monotone-x), no data point markers for >20 points.
- Bar charts: 4px corner radius on top corners, 70% bar width (30% gap between bars within a group).
- Area charts: 10% opacity fill below the line, gradient from the primary color to transparent.
- Donut charts: 60% inner radius, 4px stroke segments separated by 2px gaps.
- All charts include a tooltip on hover with the exact value, date/period, and comparison to previous period.
- Charts include a legend when displaying multiple series. Legend items are interactive — clicking toggles the series visibility.
- Charts must render responsively, using the container width. Minimum chart height: 200px. Recommended: 300px for dashboards, 400px for detail views.

#### Chart Empty States

When chart data is unavailable (new athlete, insufficient history), the chart area displays the empty state pattern: relevant icon, "Not enough data yet" headline, "Continue logging sessions to see your trends" description. The chart area retains its container size to prevent layout shift when data populates.

### 5.3 Status Indicators

Status indicators communicate the current state of an entity — athlete, session, payment, event — at a glance.

#### Dot Indicators

```
● Active       ● Paused       ○ Inactive
```

8px diameter circles with semantic colors:

| Status | Color | Usage |
|---|---|---|
| Active, Online, Paid | `--color-success` | Positive, current states |
| In Progress, Pending | `--color-warning` | Transitional states |
| Paused, Overdue | `--color-error` | Attention-required states |
| Inactive, Offline, Draft | `--color-text-tertiary` | Neutral, non-urgent states |

Dot indicators are always paired with a text label. The label uses `--text-caption` size, `--weight-medium`. The dot and label are separated by `--space-2` (8px).

#### Status Pills

```
+-----------+    +-----------+    +-----------+
|  ACTIVE   |    |  PENDING  |    |  EXPIRED  |
+-----------+    +-----------+    +-----------+
```

Extended badges (see 3.6 Badge) with all-caps labels for prominent status communication. Used in table rows, detail headers, and filter chips.

#### Pulse Animation

Status dots indicating "live" or "in progress" include a subtle pulse animation: the dot expands from 8px to 14px at 50% opacity and fades over 1.5s, repeating infinitely. This animation respects `prefers-reduced-motion`.

---

## 6. Forms

Forms are the primary data-entry mechanism. Every form must be scannable, forgiving, and explicit about what is required, what is optional, and what went wrong.

### 6.1 Form Layout

#### Single-Column Layout (Default)

All forms use single-column layout. Multi-column forms increase cognitive load and create ambiguous tab order. The single-column constraint forces clarity: one question at a time, top to bottom.

```
Label *
+------------------------------------------+
| [Input]                                   |
+------------------------------------------+
  Helper text describing expected format

Label
+------------------------------------------+
| [Input]                                   |
+------------------------------------------+

          [Cancel]   [Save Changes]
```

- Labels: 8px above the input. Required fields marked with an asterisk in `--color-error`.
- Helper text: 4px below the input, `--text-caption`, `--color-text-tertiary`. Explains expected format, constraints, or provides examples.
- Field spacing: `--space-5` (20px) between fields.
- Section spacing: `--space-7` (32px) between form sections with section headers.
- Actions: Right-aligned at the bottom of the form. Primary action is rightmost. Cancel is a ghost button.

#### Inline Forms

For compact contexts (table rows, card headers, quick-edit), forms collapse to a single row with no visible labels (relying on placeholder or context) and a save/cancel button pair. Inline forms are restricted to 2–3 fields maximum.

### 6.2 Validation

Validation occurs on blur (client-side) and on submit (server-side). Never validate on every keystroke — it punishes the user for incomplete input.

#### Error States

```
Label *
+------------------------------------------+
| [invalid input]                       ⚠ |
+------------------------------------------+
  ⚠ Email address is not valid
```

- Input border turns `--color-error` on validation failure.
- Error icon (alert triangle) appears in the trailing position.
- Error message appears below the input, replacing helper text, in `--text-caption` size, `--color-error` color, prefixed with the error icon.
- The error message must describe the problem and suggest the fix: "Email address is not valid — check for typos and try again." Not: "Invalid input."
- The first field with an error receives focus on form submission.

#### Inline Validation (Success)

```
+------------------------------------------+
| [valid input]                          ✓ |
+------------------------------------------+
```

A check icon in `--color-success` appears for validated fields. This provides positive feedback without cluttering the interface. Success validation is optional — disable for sensitive fields (passwords, payment details) where revealing validity is a security concern.

#### Server-Side Errors

Server errors (409 conflict, 422 unprocessable, 500 internal) display as a banner at the top of the form:

```
+--------------------------------------------------+
| ⚠ An account with this email already exists.      |
|   Try logging in instead or use a different email. |  --color-error bg at 10% opacity
+--------------------------------------------------+
  border-left: 3px --color-error
```

Server errors never replace client-side validation. Client validation catches format errors; server validation catches business logic errors. Both serve distinct purposes.

### 6.3 Helper Text

Helper text provides context without cluttering the field. Three types:

**Description**: Explains what the field is for.
```
Label
+------------------------------------------+
| [Input]                                   |
+------------------------------------------+
  This name will be visible to your athletes.
```

**Constraint**: Explains format requirements.
```
Label
+------------------------------------------+
| [Input]                                   |
+------------------------------------------+
  Must be at least 8 characters and include a number.
```

**Example**: Shows expected format.
```
Label
+------------------------------------------+
| [Input]                                   |
+------------------------------------------+
  e.g., alex.kim@example.com
```

Helper text is always `--text-caption` in `--color-text-tertiary`. It does not exceed one line (truncated with ellipsis if necessary, with a tooltip on hover for the full text).

### 6.4 Form Sections

Long forms (>8 fields) are divided into sections with descriptive headers:

```
─── Athlete Information ─────────────────────

Label *
+------------------------------------------+
|                                          |
+------------------------------------------+

─── Training Preferences ──────────────────

Label
+------------------------------------------+
|                                          |
+------------------------------------------+
```

- Section headers use `--text-h4`, Montserrat SemiBold, `--color-text-primary`.
- Sections are separated by `--space-7` (32px).
- Section dividers are 1px `--color-surface-6`, full width.

### 6.5 Multi-Step Forms (Wizards)

Forms with a linear sequence of steps (onboarding, program setup, event creation) use a stepper:

```
● Step 1 ── ○ Step 2 ── ○ Step 3
  Athlete Info    Goals       Schedule
```

- Active step: filled circle, `--color-brand-primary`, `--text-body` label in `--color-text-primary`.
- Completed step: filled circle, `--color-success`, with check icon.
- Future step: outlined circle, `--color-text-tertiary`, `--text-body` label in `--color-text-tertiary`.
- Connector line: 2px `--color-surface-6` between steps, 40px length.
- Steps are not clickable by default — the user must complete each step in sequence. In edit mode, completed steps become clickable for revision.
- "Back" and "Continue" buttons navigate between steps. "Continue" validates the current step before advancing.
- Progress indicator: "Step 2 of 4" text above the stepper, `--text-caption`, `--color-text-secondary`.

---

## 7. Dark Mode

Dark mode is the default and primary visual theme of MR Training. It is not an afterthought or a toggle — it is the designed state. Light mode is a secondary theme.

### 7.1 Token Mapping

The design system defines semantic tokens that map to different values in each theme. Components consume semantic tokens, never primitive color values. This indirection layer is the mechanism that enables theme switching without conditional logic in components.

```css
/* Base tokens — theme-aware */
.theme-dark {
  --color-surface-0: #0A0B0D;
  --color-surface-1: #0F0F0F;
  --color-surface-2: #141416;
  --color-surface-3: #1A1A1C;
  --color-surface-4: #1C1C1C;
  --color-surface-5: #242426;
  --color-surface-6: #2A2A2C;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #C4C4C4;
  --color-text-tertiary: #8A8A8A;
  --color-text-inverse: #0F0F0F;
}

.theme-light {
  --color-surface-0: #F5F5F5;
  --color-surface-1: #FFFFFF;
  --color-surface-2: #FAFAFA;
  --color-surface-3: #F0F0F0;
  --color-surface-4: #E8E8E8;
  --color-surface-5: #E0E0E0;
  --color-surface-6: #D4D4D4;
  --color-text-primary: #0F0F0F;
  --color-text-secondary: #4A4A4A;
  --color-text-tertiary: #8A8A8A;
  --color-text-inverse: #FFFFFF;
}
```

Brand and semantic colors remain constant across themes (Electric Orange is always #FF6B00, Error Red is always #FF3D00), but their interaction with surface colors changes — a red badge at 15% opacity reads differently on #1A1A1C versus #F0F0F0. The semantic color tokens abstract this: `--badge-error-bg` maps to `rgba(255, 61, 0, 0.15)` in dark mode and `rgba(255, 61, 0, 0.10)` in light mode to account for the different perceptual contrast requirements.

### 7.2 Contrast Specifications

All text must meet WCAG AA contrast minimums. The token mapping was designed with contrast as a first-class constraint:

| Token Pair | Dark Mode Ratio | Light Mode Ratio | WCAG Level |
|---|---|---|---|
| `--color-text-primary` on `--color-surface-1` | 21:1 | 17.4:1 | AAA |
| `--color-text-secondary` on `--color-surface-1` | 9.4:1 | 9.4:1 | AAA |
| `--color-text-tertiary` on `--color-surface-1` | 5.2:1 | 4.6:1 | AA |
| `--color-text-inverse` on `--color-brand-primary` | 4.8:1 | 5.2:1 | AA |
| `--color-brand-secondary` on `--color-surface-1` | 5.2:1 | 4.6:1 | AA |
| `--color-success` on `--color-surface-1` | 5.1:1 | 4.5:1 | AA |
| `--color-warning` on `--color-surface-1` | 4.9:1 | 4.2:1* | AA* |
| `--color-error` on `--color-surface-1` | 4.7:1 | 4.4:1 | AA |

The warning color (#FFB300) on white (#FFFFFF) achieves 4.2:1 — it meets AA for large text but falls short for body text. To compensate, warning text in light mode is rendered at `--weight-semibold` (600 weight) on Montserrat, guaranteeing it meets the 3:1 threshold for large text and doubling as a visual reinforcement.

### 7.3 Theme Switching

Theme preference is detected from `prefers-color-scheme` on initial load and stored in localStorage for subsequent visits. A theme toggle in the user menu (sun/moon icon) allows manual override. The theme switch is instant — CSS custom properties are swapped without page reload. Elements with transitions on color/background properties animate smoothly between themes over 300ms.

Images and illustrations must render legibly in both themes. Raster images with transparent backgrounds are tinted for dark mode (white illustrations on dark backgrounds, dark illustrations on light backgrounds). Vector icons and illustrations are styled with `currentColor` to inherit text color.

---

## 8. Responsive

### 8.1 Mobile-First Philosophy

Every component, every layout, every interaction is designed for the smallest screen first (320px). Features are additive as viewport width increases. This guarantees that the core experience works on every device — nothing is "desktop with a mobile fallback."

Development workflow: build the component for 320px, verify at 640px, enhance at 768px, refine at 1024px, polish at 1280px. Never build desktop-first and scale down — it produces mobile experiences that feel like compromises because they are.

### 8.2 Breakpoint-Specific Behavior

| Component | <640px | 640–767px | 768–1023px | 1024px+ |
|---|---|---|---|---|
| **Sidebar** | Drawer (hamburger) | Drawer | Collapsed (64px, icons only) | Full (240px) |
| **Top Bar** | Full width | Full width | Offset by collapsed sidebar | Offset by full sidebar |
| **Bottom Nav** | Visible (5 items) | Visible (5 items) | Hidden | Hidden |
| **Grid** | 4 columns | 8 columns | 12 columns | 12 columns |
| **Cards** | Full width, stacked | 2-across | 3-across | 3- or 4-across |
| **Tables** | Card layout | Card layout | Standard table | Standard table + resizable |
| **Modals** | Full-screen sheet | Full-screen sheet | Centered modal | Centered modal |
| **Tabs** | Dropdown (>3 items) | Dropdown (>4 items) | Scrollable | Standard |
| **Forms** | Full width, stacked fields | Full width | Max-width 640px, centered | Max-width 640px |

### 8.3 Touch Targets

All interactive elements must meet a minimum touch target size of 44x44px, as specified in WCAG 2.5.5 (Target Size, Level AAA). This applies regardless of viewport size — a button rendered at 40px height on desktop will be physically difficult to tap on a touchscreen laptop. The 44px minimum is enforced in the component API: button sizes, icon hit areas, table row heights, and navigation item heights all respect this baseline.

Compact variants (32px button, 20px badge) are permitted in data-dense contexts (tables, dashboards) with two conditions: (1) adjacent touch targets maintain a minimum 8px separation, and (2) the compact variant is not the only interaction mechanism — an alternative, larger target exists elsewhere (e.g., row-level menu vs. inline cell edit).

### 8.4 Content Width

Text-heavy content (articles, descriptions, onboarding copy) is limited to 65 characters per line regardless of viewport width. This is achieved with `max-width: 65ch` on content containers. Wider viewports gain whitespace, not longer lines.

### 8.5 Safe Areas

The interface respects device safe areas on notched phones, tablets with home indicators, and devices with rounded corners:

```css
.content {
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 12px);
}

.top-bar {
  padding-top: env(safe-area-inset-top, 0px);
}
```

Safe area insets are additive — the bottom navigation bar height (56px) adds `safe-area-inset-bottom` to its total height, ensuring navigation controls remain reachable on gesture-based devices.

---

## 9. Animation

Animation is not decoration. It is a functional design tool that guides attention, provides feedback, and communicates state transitions. Every animation must have a clear purpose; if removing the animation doesn't degrade the experience, the animation shouldn't exist.

### 9.1 Easing Curves

```css
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);   /* Default transitions */
--ease-enter: cubic-bezier(0, 0, 0.2, 1);         /* Elements appearing */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);          /* Elements leaving */
--ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);       /* Snappy interactions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful micro-interactions */
```

**Standard** (`--ease-standard`): The default curve. Starts fast, decelerates smoothly. Used for hover transitions, color changes, opacity fades, and most UI state changes.

**Enter** (`--ease-enter`): Elements entering the screen. Decelerates to a stop. Used for modals appearing, dropdowns opening, toasts sliding in, cards materializing in a list.

**Exit** (`--ease-exit`): Elements leaving the screen. Accelerates away. Used for modals closing, toasts dismissing, elements being removed. The exit curve should complete faster than the enter curve (200ms exit vs. 300ms enter) because users are done with the exiting element — don't make them wait.

**Sharp** (`--ease-sharp`): Quick, crisp movements for toggles, switches, checkboxes, and state flips. 150ms duration. Feels mechanical and responsive.

**Spring** (`--ease-spring`): Overshoot and settle. Used for celebratory micro-interactions — milestone achievements, personal records, goal completions. 400ms duration. The overshoot conveys energy and excitement. Use sparingly: spring animations on every interaction create a bouncy, unserious feel.

### 9.2 Duration Scale

| Token | Duration | Usage |
|---|---|---|
| `--duration-instant` | 50ms | Color changes on hover, state flips |
| `--duration-micro` | 100ms | Button states, toggle switches, icon changes |
| `--duration-fast` | 200ms | Small UI transitions, fade-ins, tooltips |
| `--duration-standard` | 300ms | Panel transitions, modal opens, page transitions |
| `--duration-slow` | 500ms | Complex animations, expanded content reveals |
| `--duration-dramatic` | 800ms | Page-load sequences, hero reveals, celebrations |

### 9.3 Component-Specific Animations

| Component | Trigger | Animation | Duration | Curve |
|---|---|---|---|---|
| Modal open | Trigger click | Backdrop fade-in + scale from 0.95 | 300ms | `--ease-enter` |
| Modal close | Close/Escape/backdrop click | Backdrop fade-out + scale to 0.95 | 200ms | `--ease-exit` |
| Dropdown open | Trigger click | Fade-in + translateY(-4px → 0) | 200ms | `--ease-enter` |
| Dropdown close | Click outside/Escape | Fade-out + translateY(0 → -4px) | 150ms | `--ease-exit` |
| Toast enter | Event trigger | Slide from right + fade-in | 300ms | `--ease-spring` |
| Toast exit | Auto-dismiss/close | Slide to right + fade-out | 200ms | `--ease-exit` |
| Sidebar toggle | Hamburger click | Drawer slide (translateX) | 300ms | `--ease-standard` |
| Tab switch | Tab click | Content crossfade | 200ms | `--ease-standard` |
| Progress bar fill | Value change | Width transition | 500ms | `--ease-standard` |
| Card hover | Mouse enter | Shadow + surface elevation | 200ms | `--ease-standard` |
| Skeleton loading | Page load | Shimmer sweep (1.5s loop) | 1500ms | linear |
| Page transition | Route change | Content crossfade | 300ms | `--ease-standard` |
| Milestone celebration | Goal achieved | Scale pulse + confetti | 800ms | `--ease-spring` |

### 9.4 Staggered Animations

Lists and grids animate items in sequence with a 50ms stagger delay between each item. This creates a wave-like entrance that guides the eye down the content. Formula: `delay = index * 50ms`. Maximum stagger window is 500ms (10 items) — lists longer than 10 items skip staggering and animate as a single batch.

```css
.list-item {
  opacity: 0;
  transform: translateY(8px);
  animation: listItemEnter 300ms var(--ease-enter) forwards;
  animation-delay: calc(var(--item-index) * 50ms);
}

@keyframes listItemEnter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 9.5 Loading Animations

**Spinner**: The MR monogram (M and R ligature) rotates continuously at 1 revolution per second. Size scales: 16px (inline), 24px (component), 36px (page-level), 48px (full-screen). The spinner is always `--color-brand-primary` on dark backgrounds.

**Progress Bar** (determinate): The fill width transitions smoothly over 500ms with `--ease-standard`. This smooth interpolation between progress updates prevents jarring jumps when async data resolves out of order.

**Skeleton Shimmer**: A linear gradient (`transparent → rgba(255,255,255,0.05) → transparent`) animates from `translateX(-100%)` to `translateX(100%)` over 1.5s, repeating infinitely. The shimmer respects `prefers-reduced-motion`.

### 9.6 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

When the user has enabled reduced motion at the OS level:
- All animations are disabled. State changes happen instantly.
- Skeleton shimmers become static shapes.
- Stagger delays are removed.
- Page transitions become instant.
- The spinner is replaced with a static "Loading..." text label.
- Spring animations collapse to standard ease.

This is not optional. Respecting the user's motion preferences is an accessibility requirement, not a design preference.

---

## 10. Accessibility

MR Training targets WCAG 2.1 Level AA compliance. Accessibility is not a checklist applied after development — it is a constraint woven into every design decision described in this document.

### 10.1 Focus Management

Focus is the primary navigation mechanism for keyboard and assistive technology users. Focus must be visible, logical, and never trapped unless intentional (modals).

#### Focus Ring

```
+---[ 2px Performance Blue (#0066FF), 2px offset from element ]---+
```

- Thickness: 2px
- Color: `--color-brand-secondary` (#0066FF) for most elements
- Color (accent elements): `--color-brand-primary` (#FF6B00) for orange buttons and branded elements
- Offset: 2px from the element edge (via `outline-offset: 2px`)
- The default browser focus outline (`outline: none`) must never be used without providing an equivalent custom ring
- The focus ring must contrast against both the element and its background. The 2px offset ensures the ring is always visible regardless of element color

#### Focus Order

Tab order must follow the visual reading order: left to right, top to bottom. Positive `tabindex` values are banned — they create maintenance nightmares and unpredictable navigation. Use `tabindex="0"` to add elements to the natural tab order and `tabindex="-1"` to make elements programmatically focusable without appearing in tab order.

#### Focus Trapping

Modals, drawers, and dropdowns trap focus within their bounds while open. Tab at the last interactive element moves focus to the first. Shift+Tab at the first element moves focus to the last. When the overlay closes, focus returns to the trigger element.

#### Skip Link

A "Skip to main content" link is the first focusable element on every page. It is visually hidden until focused, then appears as a floating button at the top of the viewport.

### 10.2 ARIA Landmarks

Every page uses semantic HTML landmarks to define its structure. No ARIA landmark roles on elements that have native HTML5 equivalents (use `<nav>` not `<div role="navigation">`).

| Landmark | HTML Element | Usage |
|---|---|---|
| Banner | `<header>` | Top bar |
| Navigation | `<nav>` | Sidebar, breadcrumbs |
| Main | `<main>` | Page content area |
| Complementary | `<aside>` | Detail panels, contextual sidebars |
| Contentinfo | `<footer>` | Page footer |
| Form | `<form>` | Form sections |
| Search | `<form role="search">` | Global search |

Within each landmark, headings establish the content hierarchy. Every page has exactly one `<h1>`. Sub-sections use `<h2>`, `<h3>`, and `<h4>` without skipping levels.

### 10.3 Interactive Element Labels

Every interactive element must have an accessible name. The methods, in order of preference:

1. **Visible text label** (always preferred): `<button>Save Changes</button>`, `<label for="email">Email</label>`
2. **`aria-label`**: For icon-only buttons: `<button aria-label="Close dialog"><XIcon /></button>`
3. **`aria-labelledby`**: For elements labeled by another element: `<div role="dialog" aria-labelledby="modal-title">`

#### Rules

- Inputs must have associated `<label>` elements — `placeholder` is not a label.
- Icon buttons must have `aria-label` describing the action, not the icon: "Close dialog" not "X icon."
- Image alt text must describe the content and function of the image. Decorative images use `alt=""`.
- Form error messages must be associated with their input via `aria-describedby`.

### 10.4 Dynamic Content

Content that updates without page reload must announce itself to screen readers:

- **Status messages** (save success, delete confirmation): Use `role="status"` or `aria-live="polite"` on a container that is present in the DOM on page load (not dynamically inserted). This ensures the announcement is queued and read after the user's current task.
- **Alerts** (errors, critical notifications): Use `role="alert"` which maps to `aria-live="assertive"` — announcements interrupt the current task.
- **Loading states**: Announce "Loading" and "Content loaded" using `aria-busy="true"` during data fetching and updating `aria-live` regions on completion.

#### Toast Announcements

Toasts use `role="status"` with `aria-live="polite"`. The entire toast content — icon role, message, and action label — is read by screen readers. Toast containers are present in the DOM on page load to ensure the live region is registered before announcements are queued.

### 10.5 Color Contrast

All text must meet the contrast minimums defined in Section 7.2. The design system's color tokens were selected to satisfy these requirements by default — choosing the recommended text color for a given surface guarantees AA compliance.

**Testing methodology**: Contrast is verified using the WCAG 2.1 relative luminance formula. Tools like axe-core, Lighthouse, and the Chrome DevTools contrast checker are used in CI to prevent regressions. Contrast is tested at every text size used in the interface — a color pair that passes at 18px may fail at 12px due to the different thresholds for "normal" vs. "large" text in WCAG.

### 10.6 Keyboard Navigation

All functionality must be operable through a keyboard interface without requiring specific timings for individual keystrokes (WCAG 2.1.1).

| Action | Keyboard |
|---|---|
| Navigate forward | Tab |
| Navigate backward | Shift + Tab |
| Activate button/link | Enter or Space |
| Close modal/dropdown | Escape |
| Select dropdown option | Enter |
| Navigate dropdown options | Arrow Up / Arrow Down |
| Toggle checkbox | Space |
| Select radio | Arrow keys |
| Navigate tabs | Arrow Left / Arrow Right |
| Open command palette | Cmd+K (macOS), Ctrl+K (Windows) |
| Submit form | Enter (when focus is in a form field) |

### 10.7 Screen Reader Announcements

Dynamic interactions must communicate their result:

| Event | Announcement | Method |
|---|---|---|
| Form submit success | "Form saved. 3 fields updated." | `role="status"` |
| Form submit error | "Error: Email is required." | `role="alert"` |
| Item deleted | "Alex Kim removed from roster." | `aria-live="polite"` |
| Modal opened | "Create workout dialog." | `aria-modal="true"`, focus on first field |
| Modal closed | Focus returns to trigger, trigger name announced | Native focus management |
| Tab changed | "Nutrition tab selected." | `aria-live="polite"` |
| Page loaded | Page title announced | Document `<title>` |
| Toast appears | "Success: Workout saved. View." | `role="status"` |

### 10.8 Semantic HTML

Semantic HTML is the foundation of accessibility. ARIA should be used only when HTML semantics are insufficient — primarily for complex interactive widgets (tabs, modals, autocomplete, live regions) that have no native HTML equivalent.

- `<button>` for buttons, not `<div onclick="...">`
- `<a>` for navigation, not `<span onclick="...">`
- `<table>` for tabular data, not grid of `<div>`s
- `<ul>` / `<ol>` for lists, not `<div>` with bullet characters
- `<input>` with appropriate `type` attributes for form fields
- `<select>` for dropdown selects, custom-styled but retaining the native element for accessibility

### 10.9 Testing Requirements

Accessibility testing is integrated into the development workflow:

- **Development**: eslint-plugin-jsx-a11y catches common issues (missing alt text, invalid ARIA, missing form labels) at the code level.
- **Component testing**: Every component is tested with axe-core for automated accessibility violations.
- **E2E testing**: Critical user flows are tested with Cypress axe integration.
- **Manual testing**: Before release, all views are manually tested with VoiceOver (macOS) or NVDA (Windows) and keyboard-only navigation.
- **CI enforcement**: Accessibility violations at the "critical" or "serious" level block the build. "Moderate" violations are tracked as bugs.

---

*This design system is a living document. It evolves with the product. Every component, token, and rule defined here is subject to change as we learn from usage data, user feedback, and accessibility audits. The design system serves the product — not the other way around. When the product needs something the system doesn't yet support, we extend the system before building the feature. Never bypass the design system for speed; the accumulated technical debt of one-off styles erodes product quality faster than any feature can justify.*
