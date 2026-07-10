# Landing Page Redesign — Dark Gritty "Forja tu Bestia"

**Date**: 2026-07-10
**Status**: Design approved, pending implementation

## Objective

Transform the current MR Training landing page from a text-heavy, low-impact dark page into a **high-impact, image-driven gym experience** that grabs attention, feels professional, and connects emotionally with the gym athlete audience.

## Visual Direction

**Style**: Dark Gritty — Moody, dramatic, intense. Black carbon background, fiery orange accents, heavy typography, athlete photography as the primary visual anchor.

**Brand Feeling**: Gymshark intensity + Rogue Fitness toughness + Under Armour "Protect This House" energy.

**Key Changes**:
- Replace abstract blur blobs with real athlete photography (full-bleed sections)
- Add fire ember particle systems (canvas) visible throughout
- Heavy typography with wide tracking and uppercase styling
- Texture overlays (grain, metal, concrete) more pronounced
- Fire glow effects on interactive elements
- Parallax depth between text and imagery

## Hero Section

**Current**: Text + blur blobs only. No images. Canvas particles are tiny and in final CTA only.

**New**:
- Full-viewport hero background: Unsplash photo of athlete in heavy action (squat, deadlift, sprint, or battle rope) with dark overlay (gradient black→transparent→black)
- Canvas ember/fire particle system rendered on top of the image (larger, brighter particles)
- Heavy vignette overlay on edges
- Text remains the same copy but with more dramatic typography (larger, wider tracking, text-shadow glow)
- CTA buttons more prominent with fire-glow animation
- Badge "MR TRAINING · FORJA TU BESTIA" with flame animation

**Image**: `photo-1534438327276-14e5300c3a48?w=1920&q=85` (gym athlete) or similar dramatic gym action shot

## Nav

**Current**: Clean dark transparent nav with links, lang toggle, sign-up CTA.

**New**:
- Same structure but with more dramatic blur backdrop
- Logo gets a subtle fire glow on hover
- Sign-up button gets animated fire border
- Active section link glows

## Promo Marquee

**Current**: Thin ticker with text only.

**New**:
- Same ticker but with more weight (larger font, bold)
- Background has subtle fire gradient
- Text items separated by flame emoji icons

## Athlete Journey (Sports Grid)

**Current**: 2x3 grid of small sports images with overlay gradient.

**New**:
- Asymmetric masonry grid layout (more dynamic, less rigid)
- Images are larger, higher quality
- Hover reveals intense fire glow border + scale effect
- Labels in heavy uppercase font with tracking
- Athlete role badges (Atleta/Coach/Comunidad) become larger, with photos more prominent
- Events pill badge glows

**Images**: Keep Unsplash URLs but use higher resolution (`w=800` instead of `w=600`)

## Storytelling — "Nadie viene a salvarte"

**Current**: Pure text section. Blur blob background.

**New**:
- Split-screen layout: Left column = text, Right column = full-height dramatic athlete photo (portrait or intense training moment)
- Photo has fire gradient overlay on the bottom edge
- Text stays the same copy but with decorative fire divider line between "salvarte" and "Te salvas tú"
- Subtle parallax offset between text and image
- Grain texture more pronounced

**Image**: `photo-1517836357463-d25dfeac3438?w=800&q=85` (athlete posing/action)

## Transformation — Progress Stats

**Current**: 3 gradient cards with numbers, no imagery.

**New**:
- 3 cards, each with subtle athlete photo as background (different sport per card)
- Heavy dark gradient overlay over images
- Numbers in massive display font with gradient fire
- Bottom label in uppercase with tracking
- Cards have fire glow on hover
- CountUp animation still applies

## Challenge — 30-Day

**Current**: Glass card with text, blur background.

**New**:
- Full-bleed background: group training photo with dark vignette
- Glass card remains but with stronger backdrop-blur and fire border glow
- Same copy and CTAs
- Pricing strikethrough more prominent

## Features — Orbit Map

**Current**: Desktop orbit with 10 icons + mobile grid. Detail panel on click.

**New**:
- Keep the orbit concept but make it more visually dramatic
- Icons glow with their respective colors on hover
- Center logo pulses with fire glow
- Orbit rings have gradient (orange fading to transparent)
- Detail panel (on click) has stronger fire border
- Mobile: grid remains but with glow on active card
- Background of section: subtle gym texture overlay

## Events

**Current**: Two glass cards with icons.

**New**:
- Cards have background photo relevant to the event type (tennis court, mountain)
- Dark overlay ensures text readability
- Fire glow on hover
- Calendar/Map/Users icons more prominent with orange coloring
- Background blur blob remains but more subtle

## Testimonials

**Current**: Single card carousel with avatar initials.

**New**:
- Carousel cards with real Unsplash athlete portrait photos per testimonial
- Active card has fire glow border
- Inactive cards are dimmed and smaller
- Photo is circular, positioned top-left with a glow ring
- Metric text in large gradient fire font
- Dot pagination glows orange for active dot
- Faster rotation (4s vs 5s) with more dramatic AnimatePresence transition (scale + fade)

**Images**: Use diverse Unsplash athletic portraits

## Pricing

**Current**: 3-tier table with toggle. Pro highlighted with fire glow.

**New**:
- Same structure but with more visual weight
- Pro plan badge "🔥 Fundador 50% OFF" larger and animated (pulse)
- Background of section: subtle gym image with heavy blur/dark overlay
- Feature check icons more vibrant
- Toggle switch more prominent
- Hover effect lifts card more dramatically

## FAQ

**Current**: Simple accordion with borders.

**New**:
- Same accordion structure
- Open accordion item has fire glow border-bottom
- Icons or visual cues for each question
- Background: subtle texture

## Final CTA

**Current**: Text with canvas of 40 tiny particles.

**New**:
- Full-bleed hero athlete photo (triumph/celebration pose) with dark overlay
- Canvas particle system with 80+ particles, larger and brighter (varied colors: orange, gold, red)
- Particles have slight fire flicker effect
- Text "Tu mejor versión te está esperando" with strong fire glow text-shadow
- CTA button massive, with tracking and animated glow
- "Sin tarjeta" note at bottom

**Image**: `photo-1571019613454-1cb2f99b2d8b?w=1920&q=85` (celebration/triumph)

## Footer

**Current**: Clean footer with columns and social icons.

**New**:
- Same structure but with subtle fire gradient top border
- Logo with glow
- Social icons glow on hover
- Texture overlay

## Animation & Interaction Enhancements

- **Fire ember particles**: Dedicated `<FireParticles />` component rendered on Hero and FinalCTA. 80+ particles, varied sizes (1-4px), orange/gold/red, floating upward with slight horizontal drift.
- **Parallax**: Storytelling section uses scroll-based parallax between text and image columns.
- **Button glows**: All CTAs have `animate-glow-pulse` or similar fire glow.
- **Section transitions**: Scroll-triggered reveals remain (FadeInView/SectionReveal) but with more dramatic offsets.
- **Hover effects**: Images scale 1.05-1.1x on hover. Cards lift with glow.

## Component Changes Summary

| Component | Changes |
|-----------|---------|
| `nav.tsx` | Logo glow hover, fire CTA border |
| `hero.tsx` | Full-bleed image bg + FireParticles canvas |
| `promo-marquee.tsx` | Larger font, fire gradient bg |
| `athlete-journey.tsx` | Asymmetric grid, larger images, more glow |
| `storytelling.tsx` | Split screen (text + photo), parallax |
| `transformation.tsx` | Photo bg per card, stronger gradient |
| `challenge.tsx` | Full-bleed photo bg |
| `features.tsx` | Glowing orbit, icon glow on hover |
| `events.tsx` | Photo bg per event card |
| `testimonials.tsx` | Real photos, glow active card, faster rotation |
| `pricing.tsx` | Animated badge, stronger glow |
| `faq.tsx` | Open accordion glow |
| `final-cta.tsx` | Hero image bg + bigger FireParticles |
| `footer.tsx` | Fire gradient top border |
| `globals.css` | New utilities for fire-glow-text, fire-border, stronger grain |
| **NEW** `fire-particles.tsx` | Reusable canvas particle system component |

## New Component: FireParticles

A reusable canvas component:
- Props: `count` (default 80), `colors` (orange/gold/red palette), `speed` (float multiplier)
- Renders on a full-cover canvas with `pointer-events-none`
- Particles float upward with drift, respawn at bottom when they exit top
- Used in: Hero + FinalCTA (with different densities)
- `requestAnimationFrame` loop, cleans up on unmount
- Respects `prefers-reduced-motion`

## Image Strategy

All images from Unsplash with dark overlay gradients. No local image assets. Using `next/image` would be ideal but current pattern uses raw `<img>` with `loading="lazy"`. Keep raw `<img>` for consistency, upgrade to `next/image` if performance becomes an issue.

## Accessibility

- All animations respect `prefers-reduced-motion`
- Canvas particles have `aria-hidden="true"`
- Images have descriptive `alt` text
- Color contrast maintained via dark overlays on all images
- All interactive elements keyboard-accessible

## Out of Scope

- No new sections added (unused components problem, ai-coach, community remain unused)
- No changes to i18n pattern or content
- No changes to page composition order
- No backend/data fetching
- No mobile app changes
