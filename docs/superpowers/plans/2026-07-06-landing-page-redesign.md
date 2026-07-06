# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the MR Training landing page to match the Stitch "Premium Ecosystem Landing Page" design.

**Architecture:** Replace all existing landing section components with new ones matching the Stitch layout. Reuse `Button`, `GlassCard`, `SectionHeading` shared components. Update color tokens in globals.css. New components for sections that don't currently exist (stats bar, road to elite, app showcase, running, coaches, tech advantage).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, TypeScript

---

### Task 1: Update design tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update color values to match Stitch design system**

Edit `src/app/globals.css` — change electric-orange to `#FF5C00` and velocity-blue to `#007AFF`:

```css
/* In @theme block, change: */
--color-electric-orange: #FF5C00;
--color-velocity-blue: #007AFF;
```

Update the hero-gradient to reference the new electric-orange:

```css
/* No change needed — hero-gradient uses #121414 which is fine */
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: update brand colors to Stitch design system"
```

---

### Task 2: Rewrite Navbar

**Files:**
- Modify: `src/components/landing/navbar.tsx`

- [ ] **Step 1: Replace existing Navbar with Stitch version**

Rewrite `src/components/landing/navbar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/shared';

const NAV_LINKS = [
  { href: '#programs', label: 'Programs' },
  { href: '#coaches', label: 'Coaches' },
  { href: '#ecosystem', label: 'Ecosystem' },
  { href: '#transformations', label: 'Transformations' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#131315]/80 backdrop-blur-md border-b border-[#2C2C2E]/30">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6 flex justify-between items-center h-20">
        <Link href="/" className="flex items-baseline gap-0">
          <span className="font-display-xl text-2xl font-black italic text-[#007AFF] tracking-tighter">
            MR
          </span>
          <span className="font-display-xl text-2xl font-black italic text-white tracking-tighter">
            {' '}TRAINING
          </span>
        </Link>

        <div className="hidden md:flex space-x-10 items-center">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-label-bold text-xs uppercase tracking-[0.15em] text-[#e5e1e4] hover:text-[#FF5C00] transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          <Button size="md">START TRAINING</Button>
        </div>

        <button
          className="md:hidden text-[#FF5C00]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-[#131315]/95 backdrop-blur-md border-b border-[#2C2C2E]/30">
          <div className="px-5 py-4 space-y-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block font-label-bold text-xs uppercase tracking-[0.15em] text-[#e5e1e4] hover:text-[#FF5C00] py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button size="md" className="w-full">
              START TRAINING
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/navbar.tsx
git commit -m "feat: update navbar with MR blue logo and new nav links"
```

---

### Task 3: Rewrite Hero Section

**Files:**
- Modify: `src/components/landing/hero-section.tsx`

- [ ] **Step 1: Replace hero section with Stitch version**

Rewrite `src/components/landing/hero-section.tsx`:

```tsx
import { Button } from '@/components/shared';

export function HeroSection() {
  return (
    <header className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDQZmqDnSbgqfJ3OEegPecDrG-RwY5TYnaeqdg6Cj9dNW0tyoS6_Cy0yEfEsrctZsZCxPpH-Eq_tfh9NlwtAE6HZGMT_RypU2P_-ZgwOjDS6dxJ3LoaZLXBvfNqCBCcsVz3M9HgMZWlrNfzRmgS85Z1iwVRVPQm5e3BPOIh3iYh3tpMO3LeDpRVmzerVR1QRDNflBzvnywUTyHp9HcpALw_e4WgvXmSBQMEAzPQss6kACVpFC-wRgI5uOOk3q0Q7DE0FbM8U41zuNXl')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131315]/60 via-[#131315]/30 to-[#131315]" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-6 w-full">
        <div className="max-w-3xl">
          <span className="inline-block px-4 py-1.5 bg-[#FF5C00]/20 border border-[#FF5C00] text-[#FF5C00] font-label-bold text-[10px] uppercase tracking-[0.2em] mb-6 rounded">
            Elite Performance Optimization
          </span>

          <h1 className="font-display-xl text-5xl md:text-[72px] md:leading-[80px] uppercase leading-none mb-6 text-white tracking-tight">
            Transform More <br />
            <span className="text-[#FF5C00]">Than Your Body.</span>
          </h1>

          <p className="font-body-lg text-lg md:text-[18px] md:leading-[28px] text-[#8E8E93] mb-10 max-w-xl">
            Transform your entire lifestyle with the world&apos;s most advanced athletic performance ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg">Start Assessment</Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/10"
            >
              Book Consultation
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/hero-section.tsx
git commit -m "feat: update hero section with Stitch messaging"
```

---

### Task 4: Create Stats Bar Section

**Files:**
- Create: `src/components/landing/stats-bar.tsx`

- [ ] **Step 1: Create stats bar component**

Create `src/components/landing/stats-bar.tsx`:

```tsx
const STATS = [
  { value: '10K+', label: 'Elite Athletes' },
  { value: '98%', label: 'Success Rate' },
  { value: '500K+', label: 'KM Logged' },
] as const;

export function StatsBar() {
  return (
    <section className="py-16 bg-[#131315]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="bg-[#1E1E20] border border-[#2C2C2E]/50 rounded-xl px-8 md:px-16 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-stats-number text-5xl md:text-6xl font-black text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-[#8E8E93] font-body-md text-sm uppercase tracking-[0.15em]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/stats-bar.tsx
git commit -m "feat: add stats bar section"
```

---

### Task 5: Rewrite Ecosystem Section

**Files:**
- Modify: `src/components/landing/ecosystem-section.tsx`

- [ ] **Step 1: Replace ecosystem section with 2x2 feature cards**

Rewrite `src/components/landing/ecosystem-section.tsx`:

```tsx
const FEATURES = [
  {
    icon: 'person_pin' as const,
    title: 'Personal Coach',
    description: 'Daily direct access to elite trainers for adjustments and accountability.',
  },
  {
    icon: 'directions_run' as const,
    title: 'Running Coach',
    description: 'Bio-mechanical analysis and personalized marathon preparation protocols.',
  },
  {
    icon: 'devices' as const,
    title: 'Wearables',
    description: 'Seamless bi-directional sync with Garmin, Apple Watch, and WHOOP.',
  },
  {
    icon: 'calendar_month' as const,
    title: 'Elite Events',
    description: 'Exclusive access to global summits and destination training camps.',
  },
];

function FeatureIcon({ icon }: { icon: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="1.5">
      {icon === 'person_pin' && (
        <>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <path d="M16 3.13a4 4 0 010 7.75" />
          <path d="M21 21v-2a4 4 0 00-3-3.85" />
        </>
      )}
      {icon === 'directions_run' && (
        <>
          <circle cx="13" cy="5" r="2" />
          <path d="M9 20l3-8 4 8" />
          <path d="M5 12l4-2 3 3 4-2" />
        </>
      )}
      {icon === 'devices' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 10h8v6H8z" />
          <path d="M12 16v2" />
        </>
      )}
      {icon === 'calendar_month' && (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="12" y1="14" x2="12" y2="18" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </>
      )}
    </svg>
  );
}

export function EcosystemSection() {
  return (
    <section className="py-[120px] bg-[#131315]" id="ecosystem">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-4">
            The MR Training Ecosystem
          </h2>
          <p className="text-[#8E8E93] max-w-2xl mx-auto font-body-lg">
            A 360-degree integration of technology, expert coaching, and data analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.slice(0, 2).map((feature) => (
            <div
              key={feature.title}
              className="bg-[#1E1E20] border border-[#2C2C2E]/50 rounded-xl p-8 hover:border-[#FF5C00]/50 transition-all duration-500"
            >
              <div className="w-14 h-14 bg-[#007AFF]/10 flex items-center justify-center rounded-full mb-6">
                <FeatureIcon icon={feature.icon} />
              </div>
              <h3 className="font-headline-md text-2xl font-bold uppercase mb-3">{feature.title}</h3>
              <p className="text-[#8E8E93] leading-relaxed">{feature.description}</p>
            </div>
          ))}

          <div className="md:col-span-2 flex justify-center -my-2">
            <span className="bg-[#007AFF] text-white px-6 py-2 rounded-full font-label-bold text-xs uppercase tracking-[0.2em]">
              HUB
            </span>
          </div>

          {FEATURES.slice(2).map((feature) => (
            <div
              key={feature.title}
              className="bg-[#1E1E20] border border-[#2C2C2E]/50 rounded-xl p-8 hover:border-[#FF5C00]/50 transition-all duration-500"
            >
              <div className="w-14 h-14 bg-[#007AFF]/10 flex items-center justify-center rounded-full mb-6">
                <FeatureIcon icon={feature.icon} />
              </div>
              <h3 className="font-headline-md text-2xl font-bold uppercase mb-3">{feature.title}</h3>
              <p className="text-[#8E8E93] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ecosystem-section.tsx
git commit -m "feat: replace ecosystem section with 2x2 feature card layout"
```

---

### Task 6: Create Road to Elite Section

**Files:**
- Create: `src/components/landing/road-to-elite.tsx`

- [ ] **Step 1: Create the 5-step timeline component**

Create `src/components/landing/road-to-elite.tsx`:

```tsx
import { SectionHeading } from '@/components/shared';

const STEPS = [
  {
    number: '01',
    title: 'Assessment',
    description: 'DNA sequencing, gait analysis, and baseline metabolic performance testing.',
  },
  {
    number: '02',
    title: 'The Plan',
    description: 'Custom algorithms generate your hyper-personalized training & nutrition macro-cycle.',
  },
  {
    number: '03',
    title: 'Execution',
    description: 'Daily workouts delivered via app with live bio-feedback coaching sessions.',
  },
  {
    number: '04',
    title: 'Community',
    description: 'Join high-performance squads for regional races and social challenges.',
  },
  {
    number: '05',
    title: 'Results',
    description: 'Measurable upgrades in VO2 Max, strength-to-weight ratio, and mental clarity.',
  },
] as const;

export function RoadToElite() {
  return (
    <section className="py-[120px] bg-[#1E1E20]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <SectionHeading title="The Road to Elite" align="center" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF5C00]/20 border-2 border-[#FF5C00] flex items-center justify-center mx-auto mb-6">
                <span className="text-[#FF5C00] font-headline-md text-xl font-bold">{step.number}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[calc(80%)] h-[2px] bg-gradient-to-r from-[#FF5C00] to-[#FF5C00]/20" />
              )}
              <h3 className="font-headline-md text-lg font-bold uppercase mb-3">{step.title}</h3>
              <p className="text-[#8E8E93] text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/road-to-elite.tsx
git commit -m "feat: add road to elite 5-step section"
```

---

### Task 7: Create App Showcase Section

**Files:**
- Create: `src/components/landing/app-showcase.tsx`

- [ ] **Step 1: Create app showcase with dashboard mockup**

Create `src/components/landing/app-showcase.tsx`:

```tsx
export function AppShowcase() {
  return (
    <section className="py-[120px] bg-[#131315] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-6">
              Your Coach <br />
              <span className="text-[#007AFF]">In Your Pocket.</span>
            </h2>
            <p className="text-lg text-[#8E8E93] mb-10 font-body-lg">
              The MR Training app is the brain of your transformation. Monitor real-time heart rate
              zones, track detailed lift statistics, and chat with your performance team 24/7.
            </p>

            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#007AFF]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">Universal Wearable Sync</h4>
                  <p className="text-sm text-[#8E8E93]">Native integration with Apple Health, Garmin Connect, and Strava.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#007AFF]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-4 4 4 5-5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">Predictive Recovery</h4>
                  <p className="text-sm text-[#8E8E93]">AI-driven HRV analysis suggests workout intensity based on sleep data.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="bg-[#1E1E20] px-6 py-4 flex items-center gap-3 hover:bg-[#2C2C2E] transition-colors border border-[#2C2C2E]/50 rounded-xl">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/60 uppercase leading-none">Download on the</p>
                  <p className="font-bold text-white leading-none mt-0.5">App Store</p>
                </div>
              </button>
              <button className="bg-[#1E1E20] px-6 py-4 flex items-center gap-3 hover:bg-[#2C2C2E] transition-colors border border-[#2C2C2E]/50 rounded-xl">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/60 uppercase leading-none">Get it on</p>
                  <p className="font-bold text-white leading-none mt-0.5">Google Play</p>
                </div>
              </button>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute -inset-10 bg-[#007AFF]/10 blur-[100px] rounded-full" />
            <div className="relative z-10 bg-[#1E1E20] rounded-[32px] border border-[#2C2C2E]/50 shadow-2xl p-4 w-[320px]">
              <div className="bg-[#131315] rounded-[24px] p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs text-[#8E8E93]">Good Morning</p>
                    <p className="font-headline-md text-lg font-bold text-white">Alex</p>
                  </div>
                  <div className="w-10 h-10 bg-[#FF5C00] rounded-full flex items-center justify-center text-xs font-bold text-white">
                    MR
                  </div>
                </div>

                <div className="bg-[#1E1E20] rounded-xl p-4 mb-4 border border-[#2C2C2E]/30">
                  <p className="text-[10px] text-[#8E8E93] uppercase tracking-wider mb-1">Today&apos;s Focus</p>
                  <p className="font-headline-md text-sm font-bold text-white mb-1">Lactate Threshold Run</p>
                  <p className="text-xs text-[#007AFF]">45 mins @ Zone 4</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 bg-[#1E1E20] rounded-xl p-4 border border-[#2C2C2E]/30 text-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF5C00" className="mx-auto mb-1">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    <p className="font-stats-number text-xl font-black text-white">72</p>
                    <p className="text-[10px] text-[#8E8E93]">BPM</p>
                  </div>
                  <div className="flex-1 bg-[#1E1E20] rounded-xl p-4 border border-[#2C2C2E]/30 text-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF" className="mx-auto mb-1">
                      <path d="M3 3v18h18" />
                      <path d="M7 16l4-4 4 4 5-5" />
                    </svg>
                    <p className="font-stats-number text-xl font-black text-white">88</p>
                    <p className="text-[10px] text-[#8E8E93]">Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/app-showcase.tsx
git commit -m "feat: add app showcase section with dashboard mockup"
```

---

### Task 8: Create Running Section

**Files:**
- Create: `src/components/landing/running-section.tsx`

- [ ] **Step 1: Create the running section**

Create `src/components/landing/running-section.tsx`:

```tsx
export function RunningSection() {
  return (
    <section className="py-[120px] bg-[#1E1E20] overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDBqlcerkxspIvYZ2xufa5UNoKDvjdaTw_xsPLnVz1ysVzIIShm36NqVy5RI46rGM0YtJfOXxd8_Cfi0NJbwUw1HbY8swLGEWx1oEA3ptUJP4nGdYuitSbmrF9aNjljwXUzdO4WAsybuB5qOLqSvIBJamWQdrny4BveOcGkZwR8ynVB0GshSNSrKr71xQap0swL-ovubUyo8RybqufbbPXD_UcncFg8GcJEXjCsOaUDrxH5V-KQfR4yQSMMfNAKPc94V-0rvG3U52le')`,
          }}
        />
      </div>
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <blockquote className="text-2xl md:text-3xl font-headline-md font-bold italic text-white mb-8 leading-relaxed">
              &ldquo;Whether it&apos;s your first 5K or your fifth Major, our ecosystem ensures you
              never run alone.&rdquo;
            </blockquote>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#FF5C00]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">Race Preparation</h4>
                  <p className="text-sm text-[#8E8E93]">Customized plans for 10K, Half, and Full Marathons with taper-logic.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#FF5C00]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" strokeWidth="2">
                    <path d="M2 16l4-4 4 4 4-4 4 4" />
                    <path d="M2 8l4-4 4 4 4-4 4 4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">Gait Analysis</h4>
                  <p className="text-sm text-[#8E8E93]">Video review of your running form by Olympic-level biomechanics experts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/running-section.tsx
git commit -m "feat: add running section with quote and features"
```

---

### Task 9: Create Coaches Section

**Files:**
- Create: `src/components/landing/coaches-section.tsx`

- [ ] **Step 1: Create coaches section with 3 coach cards**

Create `src/components/landing/coaches-section.tsx`:

```tsx
import { SectionHeading } from '@/components/shared';

const COACHES = [
  {
    name: 'Marcus Sterling',
    role: 'Founder / Head Coach',
    specialty: 'Endurance Specialist',
    initials: 'MS',
    description:
      'Pioneering the data-driven approach to athlete longevity and performance optimization.',
  },
  {
    name: 'Sarah Thorne',
    role: 'Performance Director',
    specialty: 'Bio-Analytics',
    initials: 'ST',
    description:
      'Specializing in metabolic flexibility and hormonal balance for executive athletes.',
  },
  {
    name: 'David Vane',
    role: 'Lead Strength Coach',
    specialty: 'Strength & Power',
    initials: 'DV',
    description:
      'Focused on explosive power and injury prevention for professional team-sport athletes.',
  },
] as const;

export function CoachesSection() {
  return (
    <section className="py-[120px] bg-[#131315]" id="coaches">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <SectionHeading title="The Architects" subtitle="Lead by the world's most sought-after performance specialists." className="mb-0" />
          <button className="flex items-center gap-2 text-[#FF5C00] font-label-bold text-xs uppercase tracking-[0.2em] group shrink-0">
            View All Coaches{' '}
            <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {COACHES.map((coach) => (
            <div
              key={coach.name}
              className="bg-[#1E1E20] border border-[#2C2C2E]/50 rounded-xl p-8 hover:border-[#007AFF]/50 transition-all duration-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#007AFF]/60 rounded-full flex items-center justify-center text-white font-headline-md text-xl font-bold">
                  {coach.initials}
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-[#007AFF]/20 border border-[#007AFF]/30 text-[#007AFF] font-label-bold text-[10px] uppercase tracking-[0.15em] rounded mb-2">
                    {coach.specialty}
                  </span>
                  <h3 className="font-headline-md text-lg font-bold">{coach.name}</h3>
                  <p className="text-xs text-[#8E8E93]">{coach.role}</p>
                </div>
              </div>
              <p className="text-[#8E8E93] text-sm leading-relaxed">{coach.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/coaches-section.tsx
git commit -m "feat: add coaches section with 3 coach cards"
```

---

### Task 10: Create Tech Advantage Section

**Files:**
- Create: `src/components/landing/tech-advantage.tsx`

- [ ] **Step 1: Create tech advantage 4-column grid**

Create `src/components/landing/tech-advantage.tsx`:

```tsx
import { SectionHeading } from '@/components/shared';

const TECH_FEATURES = [
  {
    icon: 'sync' as const,
    title: 'Real-time Monitoring',
    description: "Live telemetry from your sensors to your coach's dashboard.",
  },
  {
    icon: 'psychology' as const,
    title: 'Neural Analysis',
    description: 'Measuring mental fatigue and focus scores during key sessions.',
  },
  {
    icon: 'biotech' as const,
    title: 'Lactate Logic',
    description: 'Precision programming based on threshold and fuel utilization.',
  },
  {
    icon: 'hub' as const,
    title: 'Universal Sync',
    description: 'Centralized data from over 50+ fitness hardware integrations.',
  },
] as const;

export function TechAdvantage() {
  return (
    <section className="py-[120px] bg-[#1E1E20]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <SectionHeading
          title="The Apex Tech Advantage"
          subtitle="Driven by Data, Proven by Science."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {TECH_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#131315] border border-[#2C2C2E]/50 rounded-xl p-8 text-center hover:border-[#007AFF]/50 transition-all duration-500"
            >
              <div className="w-16 h-16 bg-[#007AFF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="1.5">
                  {feature.icon === 'sync' && (
                    <>
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
                    </>
                  )}
                  {feature.icon === 'psychology' && (
                    <>
                      <path d="M12 2a10 10 0 0110 10c0 2.5-1 5-3 6.5V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-1.5C3 17 2 14.5 2 12A10 10 0 0112 2z" />
                      <path d="M8 10h.01" />
                      <path d="M16 10h.01" />
                      <path d="M10 14h4" />
                    </>
                  )}
                  {feature.icon === 'biotech' && (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </>
                  )}
                  {feature.icon === 'hub' && (
                    <>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 4.6a10 10 0 010 14.8" />
                      <path d="M4.6 4.6a10 10 0 000 14.8" />
                    </>
                  )}
                </svg>
              </div>
              <h3 className="font-headline-md text-lg font-bold uppercase mb-3">{feature.title}</h3>
              <p className="text-[#8E8E93] text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/tech-advantage.tsx
git commit -m "feat: add tech advantage section with 4-column grid"
```

---

### Task 11: Update Pricing Section

**Files:**
- Modify: `src/components/landing/pricing-section.tsx`

- [ ] **Step 1: Replace pricing with 3-tier (Free, Performance, Elite)**

Rewrite `src/components/landing/pricing-section.tsx`:

```tsx
'use client';

import { Button } from '@/components/shared';
import { usePaddleCheckout } from '@/hooks/use-paddle-checkout';

const PLANS = [
  {
    name: 'Free',
    tagline: 'Start your 15-day performance evaluation.',
    price: '$0',
    period: '',
    features: ['Full Performance Access for 15 Days', 'Onboarding Assessment', 'App Access'],
    excluded: ['1-on-1 Coaching', 'Wearable Integration', 'Lab Panels'],
    featured: false,
    cta: 'Start Free Trial',
    badge: '15-Day Trial',
  },
  {
    name: 'Performance',
    tagline: 'App-based training with expert oversight.',
    price: '$199',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID ?? 'pri_01kwqdq8xx7s4ptpp9gqyn9dms',
    features: [
      'App-Based Training Hub',
      'Weekly Coach Check-ins',
      'Basic Wearable Integration',
      'Community Squad Access',
    ],
    excluded: [],
    featured: false,
    cta: 'Select Tier',
  },
  {
    name: 'Elite',
    tagline: 'The complete hybrid performance system.',
    price: '$449',
    period: '/month',
    priceId: 'pri_01kwqdq945983ncpjpjndhvn0b',
    features: [
      'Direct 1:1 Head Coach Access',
      'Daily Plan Adjustments',
      'Comprehensive Bio-Analytics',
      'Quarterly Lab Blood Panels',
      'VIP Event Invites',
    ],
    excluded: [],
    featured: true,
    cta: 'Start Elite Training',
    badge: 'Most Popular',
  },
];

export function PricingSection() {
  const { handlePlanSelect, loading } = usePaddleCheckout();

  return (
    <section className="py-[120px] bg-[#131315]" id="pricing">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-4">
            Choose Your Performance Tier
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`bg-[#1E1E20] border rounded-xl p-8 flex flex-col relative ${
                plan.featured
                  ? 'border-[#FF5C00] shadow-2xl scale-105'
                  : 'border-[#2C2C2E]/50'
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 font-label-bold text-[10px] uppercase tracking-widest rounded-full ${
                    plan.featured
                      ? 'bg-[#FF5C00] text-[#131315]'
                      : 'bg-[#007AFF] text-white'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <h3
                className={`font-headline-md text-2xl font-bold uppercase mb-2 ${
                  plan.featured ? 'text-[#FF5C00]' : ''
                }`}
              >
                {plan.name}
              </h3>
              <p className="text-[#8E8E93] mb-6 font-body-md text-sm">{plan.tagline}</p>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                {plan.period && (
                  <span className="text-[#8E8E93] font-body-md">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-body-md">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.featured ? '#FF5C00' : '#007AFF'} strokeWidth="2" className="shrink-0">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
                {plan.excluded.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm opacity-40 font-body-md">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.priceId || plan.name === 'Free' ? (
                <Button
                  variant={plan.featured ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => plan.priceId && handlePlanSelect?.(plan.name.toLowerCase(), plan.priceId)}
                  disabled={plan.name !== 'Free' && loading === plan.name.toLowerCase()}
                >
                  {plan.name !== 'Free' && loading === plan.name.toLowerCase()
                    ? 'Loading...'
                    : plan.cta}
                </Button>
              ) : (
                <Button variant="outline" className="w-full">
                  {plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/pricing-section.tsx
git commit -m "feat: update pricing with free/performance/elite tiers"
```

---

### Task 12: Update CTA Section

**Files:**
- Modify: `src/components/landing/cta-section.tsx`

- [ ] **Step 1: Replace CTA section with Stitch version**

Rewrite `src/components/landing/cta-section.tsx`:

```tsx
import { Button } from '@/components/shared';

const CTA_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDh96mBeXwzWGFAkZdcJ7I1Or9QB_DZ9X3xNvFHuUVcyVHOwEm9XhiOX7W5EGUFIbuU9VwTWmOTcq4HdjGY_JSDxZT9xMR_b7ns1MHdxkxLw8QKR8N6-WkIgvUCoFZ3NFBy4gSm2x2tJiy-uTBDwsioSMgI2HfdATVFOlmbCC0Cy6L66pDfK6k8sasGquB93UzTLEHAGwltLY1VBK4o1wwDWvHIMA_JTyOgV3CqX2Pu2V9ynlRGaINRZLEzjSjXSFiTT4wyvJFQzVv4';

export function CTASection() {
  return (
    <section className="py-[120px] relative overflow-hidden bg-[#131315]">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${CTA_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#131315] via-[#131315]/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display-xl text-4xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-6 text-white">
            The best time to start was <span className="text-[#FF5C00]">Yesterday.</span>
            <br />
            The second best time is <span className="text-[#007AFF]">Now.</span>
          </h2>
          <p className="text-lg text-[#8E8E93] mb-10 font-body-lg">
            Risk-Free 14-Day Performance Evaluation
          </p>
          <Button size="lg" className="tracking-[0.2em]">
            Join the Ecosystem
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/cta-section.tsx
git commit -m "feat: update CTA section with new headline and trial offer"
```

---

### Task 13: Update Footer

**Files:**
- Modify: `src/components/landing/footer.tsx`

- [ ] **Step 1: Replace footer with Stitch version**

Rewrite `src/components/landing/footer.tsx`:

```tsx
import Link from 'next/link';

const RESOURCE_LINKS = [
  { href: '#', label: 'Training Philosophy' },
  { href: '#', label: 'Success Stories' },
  { href: '#', label: 'Affiliate Program' },
  { href: '#', label: 'Knowledge Base' },
];

const SUPPORT_LINKS = [
  { href: '#', label: 'Contact Support' },
  { href: '#', label: 'FAQ' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Privacy Policy' },
];

export function Footer() {
  return (
    <footer className="bg-[#0c0f0f] border-t border-[#2C2C2E]/20 py-16">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <h2 className="font-display-xl text-2xl font-black italic text-white mb-4">
              <span className="text-[#007AFF]">MR</span> TRAINING
            </h2>
            <p className="text-sm text-[#8E8E93] leading-relaxed">
              The definitive standard in athletic excellence and lifestyle optimization.
            </p>
          </div>

          <div>
            <h4 className="font-label-bold text-xs uppercase tracking-[0.2em] text-[#8E8E93] mb-6">
              Resources
            </h4>
            <div className="space-y-4">
              {RESOURCE_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/60 hover:text-[#007AFF] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-label-bold text-xs uppercase tracking-[0.2em] text-[#8E8E93] mb-6">
              Support
            </h4>
            <div className="space-y-4">
              {SUPPORT_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/60 hover:text-[#007AFF] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-label-bold text-xs uppercase tracking-[0.2em] text-[#8E8E93] mb-6">
              Newsletter
            </h4>
            <p className="text-sm text-[#8E8E93] mb-4">
              Subscribe for performance insights and elite athlete updates.
            </p>
            <div className="flex border-b border-[#2C2C2E]/50 pb-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-transparent text-sm text-white flex-1 outline-none placeholder:text-[#8E8E93]"
              />
              <button className="text-[#FF5C00] hover:text-[#FF5C00]/80 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2C2C2E]/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#8E8E93]">
            &copy; 2024 MR TRAINING. ENGINEERED FOR ELITE RESULTS.
          </p>
          <Link href="#" className="text-[#8E8E93] hover:text-[#007AFF] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/footer.tsx
git commit -m "feat: update footer with newsletter signup and new links"
```

---

### Task 14: Wire Components into Page + Cleanup

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/landing/methodology-section.tsx`
- Delete: `src/components/landing/community-section.tsx`

- [ ] **Step 1: Update page.tsx with new component order**

Rewrite `src/app/page.tsx`:

```tsx
import { CommunitySection } from '@/components/landing/community-section';
import { CTASection } from '@/components/landing/cta-section';
import { EcosystemSection } from '@/components/landing/ecosystem-section';
import { Footer } from '@/components/landing/footer';
import { HeroSection } from '@/components/landing/hero-section';
import { MethodologySection } from '@/components/landing/methodology-section';
import { Navbar } from '@/components/landing/navbar';
import { PricingSection } from '@/components/landing/pricing-section';
```

→ Change to:

```tsx
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { StatsBar } from '@/components/landing/stats-bar';
import { EcosystemSection } from '@/components/landing/ecosystem-section';
import { RoadToElite } from '@/components/landing/road-to-elite';
import { AppShowcase } from '@/components/landing/app-showcase';
import { RunningSection } from '@/components/landing/running-section';
import { CoachesSection } from '@/components/landing/coaches-section';
import { TechAdvantage } from '@/components/landing/tech-advantage';
import { PricingSection } from '@/components/landing/pricing-section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <StatsBar />
      <EcosystemSection />
      <RoadToElite />
      <AppShowcase />
      <RunningSection />
      <CoachesSection />
      <TechAdvantage />
      <PricingSection />
      <CTASection />
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Remove unused old components**

```bash
rm src/components/landing/methodology-section.tsx
rm src/components/landing/community-section.tsx
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx 
git rm src/components/landing/methodology-section.tsx src/components/landing/community-section.tsx
git commit -m "feat: wire all new landing sections into page"
```

---

### Task 15: Final Verification

**Files:**
- Run full build check

- [ ] **Step 1: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: Clean exit

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup after landing page redesign"
```
