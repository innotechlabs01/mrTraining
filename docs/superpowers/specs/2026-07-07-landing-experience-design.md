# MR Training — Landing Experience Design

**Date:** 2026-07-07
**Status:** Approved
**Version:** 1.0

---

## 1. Overview

A cinematic, single-page landing experience for MR Training — the operating system for sports coaching. Built as a Next.js App Router application under `apps/web/` in the monorepo. The landing is not a marketing website — it is the first experience users have with the platform. Every section tells part of a cohesive story that converts visitors into athletes or coaches.

### 1.1 Objectives

- Inspire and motivate visitors within the first 3 seconds
- Communicate MR Training's value proposition clearly
- Convert visitors into sign-ups (Free tier as primary conversion)
- Establish brand credibility and premium positioning
- Showcase product depth without overwhelming

### 1.2 Design References

- Brand: Apple product launch pages (cinematic, immersive, typography-driven)
- Motion: Stripe's scroll-driven animations
- Layout: Linear's product pages (clean, purposeful, premium)
- Never: generic SaaS layouts, stock imagery, templated sections

---

## 2. Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript 5.x (strict) |
| Styling | Tailwind CSS 3.4+ with design tokens |
| Components | shadcn/ui (button, dialog primitives) |
| Animation | Framer Motion (scroll-driven, whileInView, layout animations) |
| Icons | Lucide React |
| Fonts | Montserrat (display), Inter (body), self-hosted |
| Package Manager | pnpm 9+ |

### 2.1 Design Tokens

All colors, spacing, typography, and shadows from `02-design-system.md` are mapped to Tailwind's `theme.extend`. Dark mode is default and only mode for the landing.

---

## 3. Architecture

### 3.1 Route Structure

```
apps/web/src/app/
├── (marketing)/
│   ├── layout.tsx       # Marketing shell: Nav (fixed) + Footer + children
│   └── page.tsx         # Landing page: composes all 15 sections
├── layout.tsx           # Root: fonts, metadata, Clerk provider, globals.css
└── globals.css          # Tailwind directives, CSS custom properties
```

### 3.2 Component Tree

```
page.tsx
├── LandingNav            (fixed header, transparent -> solid on scroll)
├── HeroSection           (full viewport, video background, headline + CTA)
├── StorytellingSection   (split-screen, narrative text + visual)
├── ProblemSection        (3x2 pain point grid, glass cards)
├── TransformationSection (before/after horizontal slider)
├── AICoachSection        (text + simulated AI typing demo)
├── FeaturesSection       (interactive ecosystem orbit map)
├── AthleteJourneySection (4-step horizontal timeline)
├── CoachJourneySection   (4-step horizontal timeline, mirror)
├── CommunitySection      (masonry feed grid, social proof)
├── EventsSection         (full-width BG, glassmorphism event cards)
├── TestimonialsSection   (auto-scrolling carousel)
├── PricingSection        (3-tier cards, monthly/annual toggle)
├── FAQSection            (accordion)
├── FinalCTASection       (dramatic centered CTA, particle BG)
└── FooterSection         (multi-column, logo, nav, legal)
```

### 3.3 Shared Animation Primitives

Located in `src/components/landing/animation-primitives.tsx`:

- **SectionReveal** — Wrapper. Triggers children stagger animation when section enters viewport via `whileInView`. Props: `threshold` (0.2), `staggerDelay` (100ms), `once` (true).
- **FadeInView** — Individual element. Fades up + slides 24px on viewport entry. Props: `delay`, `duration`, `direction` (up/down/left/right).
- **ParallaxLayer** — Scroll-driven translateY via `useScroll` + `useTransform`. Props: `speed` (0.1–0.5), `children`.
- **CountUp** — Animates a number from 0 to target on viewport entry. Props: `end`, `duration` (2000ms), `prefix`, `suffix`.

### 3.4 Performance Strategy

- All 15 sections use `dynamic(() => import(...))` with `loading` skeletons
- Hero video: `preload="metadata"`, `poster` attribute, `playsInline`, `muted`
- Fonts: self-hosted via `next/font` with `display: swap` and `preload: true`
- Images: `next/image` with `priority` on above-fold, `loading="lazy"` below
- Framer Motion: `layout` animations only where necessary; prefer `whileInView` over `useScroll` for body sections
- Bundle: each section is a separate chunk; core landing bundle < 80KB gzipped

---

## 4. Section Specifications

### 4.1 LandingNav

**States:**
- Transparent background at top of page (over video)
- Transitions to `bg-surface-0/80` with `backdrop-blur-xl` when scrolled past 50% of hero
- Hides on scroll down (100px threshold), reappears on scroll up
- Mobile: hamburger menu opens full-height slide-out drawer from right

**Content:**
- Left: MR Monogram + TRAINING wordmark (inline SVG logo component)
- Right: "Sign In" (ghost button) + "Get Started" (primary button, orange)
- Mobile: Logo left, hamburger right

**Animation:** Logo scales in on page load (0.95 → 1.0, spring). Background opacity transitions with Framer Motion's `useMotionValueEvent` tracking `useScroll`.

### 4.2 HeroSection

**Container:** `min-h-screen`, `relative`, `overflow-hidden`

**Layers (bottom to top):**
1. Video element — `object-cover`, `absolute inset-0`, muted, autoplay, loop, playsInline, `poster="/video/hero-poster.jpg"`. `aria-hidden="true"`.
2. Gradient overlay — `absolute inset-0`, `bg-gradient-to-b from-black/40 via-black/20 to-surface-0` (ensures text contrast, bottom fades to next section).
3. Content container — `relative z-10 flex flex-col items-center justify-center h-full text-center px-6`

**Typography sequence:**
- Overline: "THE OPERATING SYSTEM FOR SPORTS PERFORMANCE" — Montserrat Medium, 11px, `tracking-[0.1em]`, `text-brand-primary`, uppercase
- Headline: "Every athlete. Every coach. One platform." — Montserrat ExtraBold, 48px desktop / 32px mobile, `text-text-primary`, max-width 720px
- Body: "MR Training unifies training, nutrition, recovery, community, and coaching into a single platform built for how athletes and coaches actually work." — Inter Regular, 18px, `text-text-secondary`, max-width 540px
- CTAs: "Start Free Trial" (primary, 48px button) + "See How It Works" (ghost)
- Trust badge: "Trusted by coaches across 47 countries" with small globe icon

**Animation sequence (mount):**
1. 0ms: Video begins playing
2. 200ms: Overline fades up + slide 20px
3. 400ms: Headline fades up + slide 20px
4. 600ms: Body fades in
5. 800ms: CTAs scale in with spring (0.9 → 1.0)
6. 1000ms: Trust badge fades in

**Scroll indicator:** Chevron icon at bottom center, pulses with orange glow. Fades out as user scrolls. Lightweight CSS animation (`animate-bounce` with 3s duration).

**Responsive:**
- Mobile: Hero height `min-h-[90vh]` or `min-h-[100svh]`. Headline at 32px. CTAs stack vertically (`flex-col`). Video is static dark gradient on `prefers-reduced-motion`.
- Tablet: Headline 40px. Text block centered.
- Desktop: Headline 48px. Full viewport video.

### 4.3 StorytellingSection

**Container:** `min-h-screen`, two-column grid (`lg:grid-cols-2`), `items-center`, `gap-16`, `px-6 lg:px-24`

**Left column:** Visual area.
- Base state: A stylized image/illustration of fragmented coaching tools (spreadsheets, multiple phones, sticky notes)
- On scroll: Parallax drift (`translateY` at 0.3x scroll speed). Content dissolves to the MR monogram as user scrolls toward bottom of section.

**Right column:** Narrative text blocks.
- "Coaching hasn't changed in 30 years." — H2, Montserrat Bold
- Body paragraph describing the stagnation of coaching tools vs every other industry
- "While music went streaming, finance went digital, healthcare went telemedicine — coaches are still running their businesses on spreadsheets, WhatsApp, and sticky notes."
- "Athletes get scattered instructions across five different apps. Coaches burn out managing admin instead of coaching."
- Closer: "We're fixing that." — Electric Orange, Montserrat SemiBold

**Animation:**
- Each text block triggers `FadeInView` with staggered delay (200ms, 400ms, 600ms, 800ms)
- Final line appears last with orange glow
- Left image has `ParallaxLayer speed={0.3}`

**Responsive:** Single column on mobile. Image above text. No parallax on mobile (static image).

### 4.4 ProblemSection

**Container:** Standard section padding (`py-24 lg:py-32`), `bg-surface-1`

**Layout:**
- Section heading: "The tools you use are holding you back" — H2
- Section subheading: "Every coach faces the same problems. We solved them all." — Body Large
- 3×2 grid of pain point cards (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `gap-6`)

**Cards (6):**
1. Fragmented Tools — "5+ apps to run one coaching business"
2. Data Blind Spots — "No single view of athlete training, nutrition, and recovery"
3. Manual Admin — "Invoicing, scheduling, communication — all by hand"
4. Lost Revenue — "Chasing payments manually. No billing infrastructure."
5. No Ecosystem — "Nutritionists, PTs, and coaches can't collaborate"
6. Siloed Data — "Athlete data locked in separate, disconnected platforms"

**Card design:**
- Background: `bg-surface-2` with `border border-surface-6`
- Hover: `bg-surface-3`, border color shifts to `border-brand-primary/20`, `translate-y-[-4px]`, `shadow-lg`
- Icon: 24px Lucide icon in Electric Orange at top-left
- Title: Montserrat SemiBold, 18px
- Description: Inter Regular, 14px, `text-text-secondary`

**Animation:** Cards stagger in (`FadeInView`, direction: up) in reading order (left to right, top to bottom) with 100ms stagger. Icons scale in with spring on card entry.

### 4.5 TransformationSection

**Container:** `min-h-screen`, `bg-surface-0`, `flex items-center`

**Layout:** Horizontal split with draggable divider.

- Left panel: "THE OLD WAY" — cluttered desk visual, list of pain points, dark/muted tone
- Right panel: "WITH MR TRAINING" — clean UI visual, list of benefits, bright/confident tone
- Center divider: vertical line with drag handle. User can drag left/right to compare.

**Divider behavior:**
- On scroll entry: divider starts at 100% (left panel covers everything) and animates to 50% (both panels visible equally)
- After initial reveal: user can drag divider to compare panels
- Handle: 4px wide, `bg-brand-primary`, with circle grab handle (24px diameter) at center. Glow effect.

**Panel content:**
- Left (Old Way): Darker tint. Fragmented screenshots/icons. "Juggling 5 apps and a spreadsheet." "Where did that message go?" "Did they pay this month?"
- Right (MR Training): Lighter/sharper. Single dashboard screenshot. "One platform. Total clarity." "Every athlete, one view." "Automated billing."

**Animation:** Divider slides from right to center on scroll entry (1200ms, spring curve). After initial animation, drag is enabled.

**Responsive:** Mobile stacks vertically. No draggable divider. "Old Way" section above, fades to "MR Training" below as user scrolls. Uses `useScroll` + `useTransform` for the transition.

### 4.6 AICoachSection

**Container:** Standard section padding, `bg-surface-2`, dark with subtle tech/particle pattern background

**Layout:** Two-column (`lg:grid-cols-2`, `gap-16`).

**Left column:** Text content.
- Overline: "MEET YOUR AI TEAMMATE"
- Headline: "AI that coaches with you, not instead of you."
- Three feature bullets with icons:
  - Program generation — AI creates draft programs, coach approves
  - Nutrition planning — Context-aware meal plans aligned to training
  - Anomaly detection — AI flags what needs attention before it becomes a problem
- Body: "Always explainable. Always with you in control."
- CTA: "Explore AI Features →" (ghost link with arrow)

**Right column:** Demo area.
- Styled as a terminal/code window with dark background + subtle border
- Simulated AI typing effect: text types out character-by-character
- Content shows AI analyzing athlete data and suggesting a program adjustment
- Cursor blinks at end of lines
- Lines appear with staggered delay to simulate "thinking"
- Subtle green/amber text colors within the "terminal" (not brand colors — tech aesthetic)

**Animation:**
- Terminal window scales in (0.95 → 1.0, spring) on viewport entry
- Typing effect begins 500ms after terminal appears
- Text lines in left column stagger-fade-in
- Background has subtle animated grid or particle pattern (CSS-based, performant)

### 4.7 FeaturesSection

**Container:** Standard section padding, `bg-surface-1`

**Layout:**
- Section heading: "Everything your athletes need. Nothing they don't."
- Interactive orbit map: central MR monogram hub with 8-10 module nodes orbiting

**Orbit map design:**
- Center: MR monogram icon, 80px, with breathing glow animation
- Orbit rings: 3 concentric circles (dashed stroke, `stroke-surface-6`, low opacity)
- Module nodes positioned on orbits: Training, Nutrition, Recovery, Community, Events, Payments, AI, Analytics, CRM, Communications
- Each node: circle (48px) with module icon, label below
- Connection lines: thin lines from center to each node (SVG paths with `stroke-dashoffset` animation)

**Interactive behavior:**
- Hover node: node scales up (1.0 → 1.2), connection line brightens to orange, label becomes visible if hidden
- Click node: inline detail card appears below the map showing module description, features, and a "Learn More" link
- Detail card has slide-down + fade animation

**Detail card content (example for Training):**
- Icon + module name
- One-line description
- Feature list: "Multi-sport program builder, drag-and-drop periodization, auto-regulation, template library"
- "Gym, Running, Tennis, Swimming, Cycling, CrossFit" — sport tags

**Animation:**
- Orbit map fades in as a whole
- Nodes fly into orbital position from center with staggered delays (50ms each)
- Connection lines draw themselves (stroke-dashoffset 100% → 0% over 1500ms)
- Orbit rings rotate slowly (CSS `@keyframes rotate`, 60s duration, continuous)
- Center monogram pulses (scale 1.0 → 1.05 → 1.0, 3s loop)

**Responsive:** Mobile drops the orbit map. Uses a 2-column grid of compact module cards instead. Each card has icon, name, and expandable detail on tap.

### 4.8 AthleteJourneySection

**Container:** Standard section padding, `bg-surface-0`

**Layout:**
- Section heading: "Your day, amplified."
- Subheading: "From wake-up to lights out, MR Training is with you."
- Horizontal 4-step timeline

**Timeline design:**
- Horizontal line (2px, `bg-surface-6`) spanning the width
- 4 step nodes (circles, 56px) positioned on the line at 0%, 33%, 66%, 100%
- Each node has: time label above, step name below, detail card below that
- Step connection: line segments between nodes fill with `bg-brand-primary` as user scrolls

**Steps:**
1. 7:00 AM — WAKE — "Recovery score: 82. Sleep: 7.5h. HRV trending up. You're ready."
2. 12:00 PM — FUEL — "Nutrition plan calculated for today's training load. Macros pre-logged."
3. 6:00 PM — TRAIN — "Today's workout ready. Log sets in real time. Get coach feedback."
4. 9:00 PM — RECOVER — "Sleep tracking. Mobility routine. Readiness for tomorrow."

**Animation:**
- Timeline line draws as user scrolls into section (`useScroll` + `useTransform` for pathLength)
- Each node fades in and the connecting line segment fills as the "progress marker" reaches it
- Active step card has orange accent glow
- Completed steps show green checkmark

**Responsive:** Mobile stacks vertically. Timeline becomes vertical line on left side. Cards stack below each other, staggered on scroll.

### 4.9 CoachJourneySection

**Container:** Standard section padding, `bg-surface-1`

**Design:** Mirror of Section 4.8 but for coach workflow. Same timeline structure, different content.

**Steps:**
1. DESIGN — "Build programs with AI assistance. Templates save what works. Periodization built in."
2. ASSIGN — "Push programs to athletes in 1 click. Auto-syncs to their devices. No manual setup."
3. MONITOR — "Real-time adherence dashboards. Alerts when athletes need attention. Review sessions inline."
4. GROW — "Analytics show what's working. Revenue dashboard tracks your business. Scale without hiring admin help."

### 4.10 CommunitySection

**Container:** Standard section padding, `bg-surface-2`

**Layout:**
- Section heading: "Your team. Your tribe. Your edge."
- Subheading: "Training is better together. MR Training builds the community that keeps athletes coming back."
- Masonry-style card grid showing simulated community activity

**Card types (mix of 6-8 cards):**
1. Workout completion post — avatar, name, "New 5K PR! 21:32", 🔥 count
2. Challenge card — "30-Day Mobility Challenge", participant count, progress bar
3. Leaderboard snippet — top 3 athletes with scores
4. Achievement badge — "7-Day Streak" earned
5. Coach announcement — "New program starts Monday"
6. Group activity — "Marathon Prep Squad: 47 members, 12 workouts today"

**Card design:**
- Background: `bg-surface-3` with `border border-surface-6`
- Hover: `translate-y-[-2px]`, shadow increases, border brightens
- Cards have random slight rotation on entry (±2°) for organic feel
- Interaction icons (🔥, 💬, 👍) use subtle emoji or Lucide icons

**Animation:**
- Cards stagger-fade-in with random slight rotation
- Leaderboard numbers use `CountUp`
- Challenge progress bar fills from 0 on viewport entry
- Cards have subtle floating hover effect (translateY varies by card, slow CSS animation)

### 4.11 EventsSection

**Container:** Full-width, `relative`, with background image overlay

**Background:** Athletic competition/stadium image with dark overlay (`bg-black/60`). Parallax effect on scroll.

**Layout:**
- Section heading (white, over background): "Competitions. Camps. Meetups. All in one place."
- Two glassmorphism event cards floating over background

**Card design (glassmorphism):**
- Background: `bg-white/5` with `backdrop-blur-lg`, `border border-white/10`
- Border-radius: `rounded-xl`
- Shadow: `shadow-xl`
- Content: Event name, date, location, registered count, sport icon
- "Registration, waivers, scheduling, results. Built in. Not bolted on." — body text below cards

**Animation:**
- Background parallax (speed 0.15)
- Cards float with subtle vertical bob (2px, slow sine wave, CSS animation)
- Hover: glassmorphism intensifies — background becomes `bg-white/10`, border `border-white/20`
- Cards stagger in from below with scale-up (0.9 → 1.0, spring)

### 4.12 TestimonialsSection

**Container:** Standard section padding, `bg-surface-1`

**Layout:**
- Section heading: "Trusted by coaches who demand results"
- Horizontal carousel with 5 testimonial cards
- Navigation: dots below + auto-advance

**Testimonial card design:**
- Background: `bg-surface-3`, `rounded-xl`, `p-8`, `max-w-[440px]`
- Avatar (circular, 48px) + name + role at top
- Quote text: Inter Regular, 16px, `text-text-secondary`, italic
- Metric callout at bottom: "▲ 94% retention" in Success Green or "▼ 12:30 10K PR" in Electric Orange
- Subtle border: `border border-surface-6`

**Testimonials (5):**
1. Sarah Chen, Head Coach — "MR Training replaced 5 tools. Athlete retention went from 72% to 94% in 3 months." — ▲ 94% retention, 120+ athletes
2. Marcus Rivera, Olympic Triathlete — "My coach and I are finally on the same page. One platform, one source of truth." — ▼ 12:30 10K PR
3. James Park, Academy Director — "We went from spreadsheets to a real operating system. 300 athletes, 12 coaches, zero chaos." — 300 athletes, 12 coaches
4. Lisa Thompson, Sports Nutritionist — "I can see training load alongside food logs. My meal plans are finally contextual." — 85+ clients
5. David Kim, Running Coach — "The AI saves me 10 hours a week on program design. I spend that time coaching instead." — 10 hrs/week saved

**Animation:**
- Carousel auto-advances every 5 seconds
- Transition: slide-left with 400ms ease-out
- Pauses on hover
- Active card scales 1.02; inactive cards scale 0.98
- Navigation dots: active dot is orange, inactive are gray
- Metric counters animate (CountUp) when card enters viewport

### 4.13 PricingSection

**Container:** Standard section padding, `bg-surface-0`

**Layout:**
- Section heading: "Start free. Upgrade when you're ready."
- Monthly/Annual toggle at top center
- Three pricing cards in a row
- Pro card elevated with orange accent and "MOST POPULAR" badge

**Toggle design:**
- Two buttons side by side: "Monthly" / "Annual"
- Active: `bg-brand-primary`, `text-text-inverse`
- Inactive: `bg-surface-3`, `text-text-secondary`
- Annual includes "Save 20%" badge in Success Green
- Toggling animates price numbers (CountUp transition)

**Card design:**
- Background: `bg-surface-2`, `rounded-xl`, `p-8`, `border border-surface-6`
- Pro card: elevated with `shadow-lg`, `border-brand-primary/30`, 2px orange top border
- Tier name: Montserrat Bold, 22px
- Price: Montserrat ExtraBold, 48px, with "/month" in Inter Regular, 14px, `text-text-tertiary`
- Divider: `border-surface-6`
- Feature list: check icons (green) for included, dash for not included
- CTA button: primary for Pro, secondary for Free/Enterprise

**Tiers:**
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Price | $0/mo | $49/mo | Custom |
| Athletes | Up to 5 | Up to 100 | Unlimited |
| Sports | 1 | All | All |
| Programs | 3 active | Unlimited | Unlimited |
| AI Features | — | Basic | Advanced |
| Payments | — | Yes | Yes + Custom |
| API | — | — | Full REST |
| SSO/SAML | — | — | Yes |

**Animation:**
- Cards stagger in from bottom on scroll entry (200ms stagger)
- Pro card scales to 1.05, Free/Enterprise to 1.0
- Price numbers animate on toggle
- "MOST POPULAR" badge pulses gently

### 4.14 FAQSection

**Container:** Standard section padding, `bg-surface-1`, `max-w-3xl mx-auto`

**Layout:**
- Section heading: "You've got questions. We've got answers."
- Accordion list, 7 questions

**Accordion design:**
- Each item: `border-b border-surface-6`
- Header: question text, Montserrat SemiBold, 18px, with chevron icon on right
- Expanded: chevron rotates 180°, answer text appears below, background shifts to `bg-surface-3/50`
- Height animation: Framer Motion `animate={{ height: isOpen ? 'auto' : 0 }}`
- Only one item open at a time (accordion behavior)

**Questions:**
1. How is this different from Trainerize/TrueCoach?
2. Can I migrate my existing athletes?
3. Can I use my own branding?
4. Is there a mobile app for athletes?
5. What sports do you support?
6. How does the AI work — does it replace coaches?
7. Can I cancel anytime?

### 4.15 FinalCTASection

**Container:** `min-h-[80vh]` or `min-h-screen`, `bg-surface-0`, `flex items-center justify-center`, `relative overflow-hidden`

**Background:** Dark surface with subtle animated particles/light streaks. CSS-only animation: thin diagonal lines moving slowly across the background at low opacity, creating a premium "technology in motion" feel without video overhead.

**Content (centered, text-center):**
- Headline: "THE NEXT GENERATION OF COACHING IS HERE." — Montserrat ExtraBold, 56px desktop / 36px mobile, `text-text-primary`, max-width 800px
- Three sequential lines:
  - "Your athletes deserve better." — fade in
  - "Your business deserves better." — fade in
  - "You deserve better." — fade in, Electric Orange
- CTA: Large primary button (56px height, 24px horizontal padding), "START BUILDING — FREE"
- Subtext below CTA: "No credit card. 5 athletes free. Set up in under 3 minutes." — Inter Regular, 14px, `text-text-tertiary`

**Animation:**
- Headline: characters fade+slide up with 50ms stagger per word
- Three "deserves" lines: sequential fade-in with 300ms delay between each
- "You deserve better": Electric Orange with subtle text-shadow glow
- CTA button: breathing glow animation (box-shadow pulse, `0 0 20px rgba(255,107,0,0.3)` ↔ `0 0 40px rgba(255,107,0,0.6)`, 2s loop)
- Background streaks: CSS `@keyframes` diagonal movement, 20s loop, multiple staggered animations

### 4.16 FooterSection

**Container:** `bg-surface-1`, `border-t border-surface-6`, `py-16 px-6 lg:px-24`

**Layout:** Multi-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-5`, `gap-12`)

**Columns:**
1. Logo + tagline (spans wider on mobile): MR monogram + wordmark, "The operating system for sports performance." — Inter Regular, 14px, `text-text-tertiary`
2. Product: Features, Pricing, AI Coach, Mobile App, API
3. Company: About, Blog, Careers, Contact, Press
4. Legal: Privacy Policy, Terms of Service, GDPR, Cookie Policy
5. Connect: Twitter, Instagram, LinkedIn, YouTube — icon links

**Bottom bar:** `border-t border-surface-6`, `pt-8 mt-8`, centered text: "© 2026 MR Training Inc. All rights reserved."

**Animation:** Columns stagger-fade-in from bottom (50ms stagger). Logo scales in. Link hover: `text-brand-primary` transition.

---

## 5. Accessibility

- All sections have semantic HTML landmarks (`<section>`, `<nav>`, `<footer>`)
- Skip-to-content link at top of page
- All interactive elements are keyboard accessible
- Focus indicators visible (2px Performance Blue ring)
- `prefers-reduced-motion`: disables autoplay video, disables parallax, disables carousel auto-advance, reduces animation durations to 0ms or 150ms fade
- All text meets WCAG AA contrast minimums against backgrounds
- Video has `aria-hidden="true"` (decorative)
- Alt text on all images
- Form inputs have labels (for future signup modal)

---

## 6. SEO

- Dynamic OG image generation via `opengraph-image.tsx`
- Structured data: `Organization` schema with logo, social profiles
- Meta description: compelling 160-character summary
- `h1` on Hero, `h2` on section headings, semantic hierarchy maintained
- All links are crawlable `<a>` tags (not JS-only)
- `sitemap.xml` auto-generated
- Canonical URL set
- `lang="en"` on `<html>`

---

## 7. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "framer-motion": "^11.0",
    "lucide-react": "^0.400",
    "clsx": "^2.1",
    "tailwind-merge": "^2.4"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3",
    "tailwindcss": "^3.4",
    "postcss": "^8.4",
    "autoprefixer": "^10.4"
  }
}
```

---

## 8. File Inventory

```
apps/web/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   └── video/
│       └── hero.mp4                    (user-provided)
│       └── hero-poster.jpg             (generated from video)
├── src/
│   ├── app/
│   │   ├── layout.tsx                  (root: fonts, metadata, globals)
│   │   ├── globals.css                 (Tailwind + CSS vars)
│   │   └── (marketing)/
│   │       ├── layout.tsx              (Nav + Footer shell)
│   │       └── page.tsx                (composes sections)
│   ├── components/
│   │   └── landing/
│   │       ├── index.ts                (barrel export)
│   │       ├── animation-primitives.tsx
│   │       ├── logo.tsx
│   │       ├── nav.tsx
│   │       ├── hero.tsx
│   │       ├── storytelling.tsx
│   │       ├── problem.tsx
│   │       ├── transformation.tsx
│   │       ├── ai-coach.tsx
│   │       ├── features.tsx
│   │       ├── athlete-journey.tsx
│   │       ├── coach-journey.tsx
│   │       ├── community.tsx
│   │       ├── events.tsx
│   │       ├── testimonials.tsx
│   │       ├── pricing.tsx
│   │       ├── faq.tsx
│   │       ├── final-cta.tsx
│   │       └── footer.tsx
│   └── lib/
│       └── utils.ts
└── pnpm-workspace.yaml                (already at root)
```
