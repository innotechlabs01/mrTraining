# Landing Page Redesign — MR Training

## Source

Based on the "Premium Ecosystem Landing Page" design from Stitch project 17534837130532385838.

## Brand

- Product name: **MR TRAINING** (logo "MR" in velocity blue `#007AFF`)
- Full brand: MR TRAINING / APEX PERFORMANCE (used interchangeably)
- Dark theme, high-performance athletic positioning

## Sections (top-to-bottom)

### 1. Navbar
- Logo: "MR" in velocity blue, "TRAINING" in white, both Montserrat black italic
- Nav links: PROGRAMS, COACHES, ECOSYSTEM, TRANSFORMATIONS
- CTA button: "START TRAINING" (electric orange)
- Sticky, backdrop-blur, border-b

### 2. Hero
- Tagline: "Transform More Than Your Body."
- Subtitle: "Transform your entire lifestyle with the world's most advanced athletic performance ecosystem."
- Primary CTA: "Start Assessment" (electric orange filled)
- Secondary CTA: "Book Consultation" (velocity blue outline)
- Down-arrow scroll indicator at bottom
- Background: dark gradient overlay on hero image

### 3. Stats Bar
- Horizontal row of 3 stats in glass-card style:
  - **10K+** Elite Athletes
  - **98%** Success Rate
  - **500K+** KM Logged
- Montserrat extrabold numbers, centered layout

### 4. Ecosystem Intro + Feature Cards
- Heading: "The MR Training Ecosystem"
- Subtitle: "A 360-degree integration of technology, expert coaching, and data analytics."
- 2x2 feature card grid:
  - **Personal Coach** — Daily direct access to elite trainers
  - **Running Coach** — Bio-mechanical analysis + marathon prep
  - **Wearables** — Seamless sync with Garmin, Apple Watch, WHOOP
  - **Elite Events** — Exclusive global summits + training camps
- HUB badge between top two cards

### 5. Road to Elite (5-step)
Numbered vertical/horizontal flow:
1. **Assessment** — DNA sequencing, gait analysis, metabolic testing
2. **The Plan** — Custom algorithms generate hyper-personalized macro-cycle
3. **Execution** — Daily workouts with live bio-feedback coaching
4. **Community** — Join high-performance squads for challenges
5. **Results** — Measurable upgrades in VO2 Max, strength, mental clarity

### 6. App Showcase — "Your Coach In Your Pocket"
- Left column: headline + description + 2 features (Universal Wearable Sync, Predictive Recovery) + App Store / Google Play buttons
- Right column: phone frame mockup showing dashboard ("Good Morning, Alex — Today's Focus: Lactate Threshold Run — 72 BPM, 88 Score")

### 7. Run with the Elite
- Quote about running + CTA
- Two feature bullets: Race Preparation, Gait Analysis
- Background image treatment

### 8. The Architects (Coaches)
- Heading with "View All Coaches" link
- 3 coach cards:
  - **Marcus Sterling** — Founder/Head Coach — Endurance Specialist
  - **Sarah Thorne** — Performance Director — Bio-Analytics
  - **David Vane** — Lead Strength Coach — Strength & Power
- Each: avatar circle, title/specialty badge, name, role, description

### 9. Tech Advantage
- 4-column grid:
  - Real-time Monitoring — Live telemetry from sensors to coach dashboard
  - Neural Analysis — Mental fatigue and focus scores
  - Lactate Logic — Threshold and fuel utilization programming
  - Universal Sync — Centralized data from 50+ fitness integrations
- Section heading: "The Apex Tech Advantage — Driven by Data, Proven by Science."

### 10. Pricing (3 tiers)

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | Free (15-day trial) | Full Performance access for 15 days, then locks |
| Performance | $199/mo | App-Based Training Hub, Weekly Coach Check-ins, Basic Wearable Integration, Community Squad Access |
| Elite (Popular) | $449/mo | Direct 1:1 Head Coach, Daily Plan Adjustments, Comprehensive Bio-Analytics, Quarterly Lab Panels, VIP Event Invites |

- "Most Popular" badge on Elite
- "Select Tier" / "Start Elite Training" CTAs

### 11. CTA Section
- Headline: "The best time to start was Yesterday. The second best time is Now."
- Button: "Join the Ecosystem"
- Subtext: "Risk-Free 14-Day Performance Evaluation"
- Background image with gradient overlay

### 12. Footer
- Logo + tagline
- Links: Training Philosophy, Success Stories, Affiliate Program, Knowledge Base
- Support: Contact Support, FAQ, Terms of Service, Privacy Policy
- Newsletter signup with email input + submit arrow
- Copyright: "© 2024 MR TRAINING. ENGINEERED FOR ELITE RESULTS."
- Social link (globe icon)

## Design Tokens

- Colors: electric-orange `#FF5C00`, velocity-blue `#007AFF`, background `#131315`, deep-slate `#1E1E20`, muted-gray `#8E8E93`
- Fonts: Montserrat (headlines/display), Inter (body)
- Container max: 1280px
- Section gap: 120px (large), 64px (small)
- Glass card: rgba(30,30,32,0.7) bg + blur + 1px border

## Implementation

- **All sections get new components** in `src/components/landing/`
- Reuse existing `Button`, `GlassCard`, `SectionHeading` shared components
- Keep nav/footer unchanged structurally but update content
- Update `globals.css` colors to match: `#FF5C00` for electric-orange, `#007AFF` for velocity-blue
- Wire into `src/app/page.tsx`
