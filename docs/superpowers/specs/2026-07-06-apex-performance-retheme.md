# Apex Performance Visual Retheme

**Date:** 2026-07-06
**Brand:** MR TRAINING (unchanged)
**Design System:** Apex Performance

## Goal

Apply the Apex Performance design system to the existing MR TRAINING landing page. All 12 sections retain their current layout and content — only colors, typography, surface layers, spacing, and component styling are replaced.

## Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Electric Orange | `#FF6B00` | Primary buttons, active states, motivational highlights |
| Performance Blue | `#0066FF` | Secondary accent, data viz, progress tracking, technical metrics |
| Deep Black | `#0F0F0F` | Page background, primary bg |
| Charcoal Gray | `#1C1C1C` | Cards, navigation, elevated surfaces |
| Surface Container Low | `#1A1C1C` | Elevated card surfaces |
| Surface Container | `#1E2020` | Modals/popovers |
| Surface Container High | `#282A2B` | Highest elevation surfaces |
| On Surface | `#E2E2E2` | Primary text (headings) |
| On Surface Variant | `#C4C7C7` | Secondary body text |
| Outline | `#8E9192` | Borders, dividers |

### Typography

| Style | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| Display XL | Montserrat | 64px | 800 | 72px | -0.02em |
| Display XL Mobile | Montserrat | 48px | 800 | 56px | -0.02em |
| Headline LG | Montserrat | 40px | 700 | 48px | -0.01em |
| Headline LG Mobile | Montserrat | 32px | 700 | 38px | - |
| Headline MD | Montserrat | 24px | 700 | 32px | - |
| Body LG | Inter | 18px | 400 | 28px | - |
| Body MD | Inter | 16px | 400 | 24px | - |
| Label Bold | Inter | 14px | 600 | 20px | 0.05em |
| Stats Number | Montserrat | 32px | 800 | 32px | - |

All display and headline styles use **uppercase** to mimic athletic jerseys and stadium signage.

### Surfaces & Elevation

Depth is achieved through **tonal layering** (no drop shadows):

- **Level 0 (Background):** Deep Black `#0F0F0F`
- **Level 1 (Cards/Nav):** Charcoal Gray `#1C1C1C`
- **Level 2 (Modals):** Lighter gray `#2C2C2C` with 1px border at 10% white opacity
- **Floating elements:** high-spread, low-opacity black shadow

### Shapes

- Base radius: **4px** (buttons, inputs, chips)
- Large containers: **8px** (progress cards, video containers)

### Spacing

- Grid: 12-column fluid (desktop) / 4-column (mobile)
- Column gutter: 24px
- Desktop margin: 40px
- Mobile margin: 20px
- Stack SM: 8px, Stack MD: 16px, Stack LG: 32px

## Component Styles

### Buttons

| Variant | Background | Text |
|---------|-----------|------|
| Primary | Electric Orange `#FF6B00` | Black, Montserrat Bold uppercase |
| Secondary | Performance Blue `#0066FF` | White |
| Ghost | Transparent, 2px white border | White |

### Data Cards

- Background: Charcoal Gray `#1C1C1C`
- **Left-accent border:** 4px wide (Performance Blue for cardio/metrics, Electric Orange for strength/action)
- Typography: Montserrat for large centered numbers, uppercase Inter labels at 60% opacity

### Progress Bars

- Track height: 8px
- Unfilled: `#0F0F0F`
- Filled: Performance Blue gradient

### Inputs

- Background: `#0F0F0F`
- Border: 1px `#2C2C2C`
- Focus: border transitions to Electric Orange

## Sections (unchanged from current)

All 12 sections keep their current layout, content, and section ordering:

1. Navbar — MR logo (MR in Electric Orange? Wait, the current is MR=blue, TRAINING=white. For Apex: MR in Performance Blue or Electric Orange? Actually let me check: the user said "Keep MR TRAINING brand". The current logo style has MR in #007AFF which becomes #0066FF Performance Blue.)
2. Hero Section — "Transform More Than Your Body"
3. Stats Bar — 10K+, 98%, 500K+
4. Ecosystem Section — 2x2 HUB feature cards
5. Road to Elite — 5-step timeline
6. App Showcase — Dashboard mockup
7. Running Section — Quote + features
8. Coaches Section — 3 coach cards
9. Tech Advantage — 4-column grid
10. Pricing — 3 tiers
11. CTA — Headline + join
12. Footer — Newsletter + links

### Pricing Adjustments

Free tier button: Ghost style (transparent + white border)
Performance tier button: Secondary style (Performance Blue)
Elite tier button: Primary style (Electric Orange) — elevated via orange accent border on card

## Implementation Plan

### Step 1: Update globals.css
- Replace all color variables with Apex tokens
- Update typography classes (sizes, weights, line-heights)
- Add/sync font-family Montserrat + Inter weights

### Step 2-13: Update each component
Per component: replace hardcoded color values, update font sizes/weights, adjust surface colors, apply left-accent borders where appropriate, update button styles to match variant system.

### Step 14: Final verification
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Files to Modify

All under `src/components/landing/`:
- `navbar.tsx`
- `hero-section.tsx`
- `stats-bar.tsx`
- `ecosystem-section.tsx`
- `road-to-elite.tsx`
- `app-showcase.tsx`
- `running-section.tsx`
- `coaches-section.tsx`
- `tech-advantage.tsx`
- `pricing-section.tsx`
- `cta-section.tsx`
- `footer.tsx`

Plus:
- `src/app/globals.css` — design token updates
- `src/components/shared/button.tsx` — button variant alignment (if needed)
