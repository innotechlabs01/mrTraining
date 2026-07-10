# UI/UX Pro Max — Landing Page Design Spec

**Product:** UI/UX Pro Max — Design inspection tool (visual review + code inspector + versioning)
**Style:** Clean & Minimal (light theme, Indigo primary, Figma/Linear vibe)
**Route:** `/ui-ux-pro-max` within the existing MR Training `apps/web` Next.js app

---

## 1. Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--surface-0` | `#FFFFFF` | Page background |
| `--surface-1` | `#F8FAFC` | Section backgrounds, footer |
| `--surface-2` | `#F1F5F9` | Card/hover backgrounds |
| `--surface-3` | `#E2E8F0` | Borders, dividers |
| `--text-primary` | `#0F172A` | Headings |
| `--text-secondary` | `#475569` | Body text |
| `--text-tertiary` | `#94A3B8` | Captions, meta |
| `--brand-primary` | `#6366F1` | Buttons, links, accents |
| `--brand-primary-hover` | `#4F46E5` | Button hover |
| `--brand-secondary` | `#0EA5E9` | Secondary accents, badges |

### Typography

- **Font family:** Inter (body + headings via `font-bold`/`font-black`)
- **Scale:** Tailwind default (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-4xl`, `text-5xl`, `text-6xl`)

### Spacing

- Section padding: `py-24 lg:py-32`
- Container: `max-w-6xl mx-auto px-6`
- Card gap: `gap-8`

### Components pattern

- Cards: white bg (`bg-white`), subtle border (`border border-slate-200`), rounded (`rounded-lg` or `rounded-xl`), subtle shadow (`shadow-sm hover:shadow-md`)
- Buttons: filled (Indigo) or outline (slate border)
- Icon containers: `w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center`

---

## 2. Page Sections

### 2.1 Hero

- **Layout:** Two columns (text left, mockup right)
- **Headline:** *"Inspect designs. Review with context. Ship faster."*
  - `font-black text-5xl lg:text-6xl text-slate-900`
- **Subtitle:** *"UI/UX Pro Max unifies visual review, code inspection, and versioning in one place."*
  - `text-lg text-slate-500`
- **CTA:** "Start free trial" (Indigo filled) + "See how it works" (outline)
- **Mockup:** Screenshot of the product dashboard showing a design being inspected
  - Image at `w=1200&q=85` from Unsplash (a design tool UI mockup) or placeholder
  - Shadow: `shadow-2xl rounded-xl`
- **Background:** Subtle indigo/sky gradient decoration (top-right corner)

### 2.2 Features (3-column centered grid)

| Icon | Title | Description |
|------|-------|-------------|
| `Eye` | Visual Review | Comment directly on designs. Pinpoint precision, threaded discussions, one-click approval. |
| `Code` | Code Inspector | Inspect CSS, measurements, typography, assets. Copy code with one click. Works with Figma/Sketch. |
| `GitBranch` | Version History | Every change is saved. Compare versions, restore previous ones, full audit trail. |

- Cards centered, `text-center` layout
- Icon container: `w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mx-auto mb-4`
- Card: `bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow`
- Section heading: *"Everything you need to review designs"* + subtitle

### 2.3 How It Works (3-step horizontal)

1. **Upload** — Upload your design from Figma, Sketch, or direct file import
2. **Inspect & Review** — Inspect CSS, measurements, assets. Leave precise comments.
3. **Share & Approve** — Share with your team. Approve or request changes. Every version is tracked.

- Steps connected visually with dashed lines or numbers
- Each step: number circle + title + description
- Layout: `grid grid-cols-1 md:grid-cols-3 gap-8 text-center`
- Step number: `w-14 h-14 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center mx-auto`

### 2.4 Integrations

- Logo row: Figma, Sketch, Adobe XD, Zeplin
- Layout: Simple flex-wrap row of logos, grayscale with hover effect
- Heading: *"Works with your favorite tools"*

### 2.5 Pricing (3-column)

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 1 project, 3 reviewers, 7-day history |
| **Pro** | $19/mo | Unlimited projects, 15 reviewers, full history, CSS export |
| **Enterprise** | Custom | SSO, audit logs, priority support, on-premise |

- Pro card highlighted with Indigo border and "Most popular" badge
- CTA per card: "Get started" / "Start free trial" / "Contact sales"
- Layout: `grid grid-cols-1 md:grid-cols-3 gap-6`

### 2.6 Final CTA

- Background: Indigo gradient (`#6366F1` → `#4F46E5`)
- Headline (white): *"Ready to ship better designs?"*
- Button: White filled with Indigo text
- Centered layout

### 2.7 Footer

- Background: `bg-slate-50` (`#F8FAFC`)
- Columns: Product (Features, Pricing, Integrations), Resources (Docs, API, Blog), Company (About, Changelog, Contact), Legal (Privacy, Terms)
- Bottom bar: Copyright + social icons

---

## 3. Technical Implementation

### Route structure

```
src/app/ui-ux-pro-max/
  page.tsx         → landing page (server component wrapping client sections)
  layout.tsx       → overrides CSS variables for light/clean theme

src/components/ui-ux-pro-max/
  hero.tsx
  features.tsx
  how-it-works.tsx
  integrations.tsx
  pricing.tsx
  cta.tsx
  footer.tsx
```

### Layout strategy

- Create a new layout at `/ui-ux-pro-max/layout.tsx` that redefines CSS custom properties for the light theme
- Page is in a new route group or standalone route, not inheriting the `(marketing)` route group's theme
- Root layout (Inter font, globals.css) still applies — only CSS variable values change

### Client components

- All section components use `'use client'` for hover/scroll animation support
- Use `framer-motion` for entrance animations (already a dependency)
- Simple, elegant motion: `fadeIn` + `slideUp`

---

## 4. Out of Scope

- Actual product functionality (dashboard, inspector)
- Authentication integration (Clerk not needed for this page)
- SEO metadata (can be added in layout)
- Translations (English-only for MVP)
