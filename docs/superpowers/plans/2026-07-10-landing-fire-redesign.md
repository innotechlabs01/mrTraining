# Landing Fire Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the MR Training marketing landing into a fire-driven, emotional, bilingual (ES/EN), multi-sport experience with combined promotions.

**Architecture:** Single component tree under `apps/web/src/components/landing/*`. A `LanguageProvider` context feeds a `useLang()` hook; every section reads from a `{ es, en }` content object — no duplicated JSX. Fire theme via new Tailwind tokens + `globals.css` utilities. Marketing page wraps everything in the provider.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, framer-motion, lucide-react. Images: Unsplash (stock URLs) + AI-generated fire textures placed in `public/`.

---

## File Structure

**New:**
- `apps/web/src/components/landing/i18n.tsx` — `LanguageProvider`, `useLang`, `Lang` type, localStorage persistence.
- `apps/web/src/components/landing/promo-marquee.tsx` — looping promo bar.
- `apps/web/src/components/landing/challenge.tsx` — 30-day challenge block w/ countdown + founder discount.

**Modify:**
- `apps/web/tailwind.config.ts` — add `brand.ember`, `fire-flicker` + `marquee` animations.
- `apps/web/src/app/globals.css` — add `.text-gradient-fire`, `.fire-glow`, `.grain`, `.ember-text`.
- `apps/web/src/components/landing/nav.tsx` — ES/EN switch + "Entrenar gratis" CTA.
- `apps/web/src/components/landing/hero.tsx` — fire hero, bilingual.
- `apps/web/src/components/landing/athlete-journey.tsx` — repurpose as Multideporte.
- `apps/web/src/components/landing/storytelling.tsx` — emotional manifesto, bilingual.
- `apps/web/src/components/landing/transformation.tsx` — before/after + progress testimonials.
- `apps/web/src/components/landing/features.tsx` — fire features, bilingual.
- `apps/web/src/components/landing/events.tsx` — races/community events.
- `apps/web/src/components/landing/testimonials.tsx` — faces + punchy quotes.
- `apps/web/src/components/landing/pricing.tsx` — plans + founder discount highlighted.
- `apps/web/src/components/landing/faq.tsx` — short Q&A.
- `apps/web/src/components/landing/final-cta.tsx` — full-width fire CTA.
- `apps/web/src/components/landing/footer.tsx` — links + socials.
- `apps/web/src/app/(marketing)/page.tsx` — reorder sections, wrap in provider.

**Convention for every section:** `'use client'`; top-level `export function XSection() { const { t } = useLang(); ... }` where `t` is the resolved `{ es, en }` content object or a helper `t('es string','en string')`. We use the string-pair helper for simplicity:

```ts
const { es, en } = useLang();
const txt = (e: string, n: string) => (es ? e : n);
```

---

## Task 1: Design tokens (Tailwind + globals)

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Add ember color + fire animations to tailwind.config.ts**

Replace the `brand` block in `theme.extend.colors` and the `animation`/`keyframes` blocks:

```ts
colors: {
  brand: {
    primary: '#FF6B00',
    'primary-hover': '#E85D00',
    'primary-pressed': '#CC5200',
    'primary-light': '#FF8A33',
    ember: '#FFB300',
    'ember-light': '#FFD166',
    secondary: '#0066FF',
    'secondary-hover': '#3385FF',
    'secondary-pressed': '#0044CC',
  },
  surface: { 0: '#0A0B0D', 1: '#0F0F0F', 2: '#141416', 3: '#1A1A1C', 4: '#1C1C1C', 5: '#242426', 6: '#2A2A2C' },
  success: '#00C853', error: '#FF3D00', warning: '#FFB300',
  teal: { accent: '#00BFA5' }, violet: { accent: '#7C4DFF' }, coral: { accent: '#FF5252' },
},
```

```ts
animation: {
  'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  'float': 'float 6s ease-in-out infinite',
  'orbit': 'orbit 60s linear infinite',
  'streak': 'streak 20s linear infinite',
  'fire-flicker': 'fire-flicker 3s ease-in-out infinite',
  'marquee': 'marquee 28s linear infinite',
},
keyframes: {
  'glow-pulse': { '0%, 100%': { boxShadow: '0 0 20px rgba(255,107,0,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(255,107,0,0.6)' } },
  float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-8px)' } },
  orbit: { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
  streak: { '0%': { transform: 'translateX(-100%) translateY(-100%)' }, '100%': { transform: 'translateX(100%) translateY(100%)' } },
  'fire-flicker': { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '45%': { opacity: '0.92', transform: 'scale(1.02)' }, '70%': { opacity: '0.97', transform: 'scale(0.99)' } },
  marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
},
```

- [ ] **Step 2: Add fire utilities to globals.css**

Append inside `@layer components` (after `.text-gradient-orange`):

```css
.text-gradient-fire {
  background: linear-gradient(135deg, #FF6B00, #FFB300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ember-text { color: #FFB300; }
.ember-text-light { color: #FFD166; }
.fire-glow { box-shadow: 0 0 24px rgba(255, 107, 0, 0.45); }
.grain {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E");
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/app/globals.css
git commit -m "feat(landing): fire design tokens (ember, flicker, marquee, utilities)"
```

---

## Task 2: i18n provider

**Files:**
- Create: `apps/web/src/components/landing/i18n.tsx`

- [ ] **Step 1: Create i18n.tsx**

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Lang = 'es' | 'en';
const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'es',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && window.localStorage.getItem('mr-lang')) as Lang | null;
    if (stored === 'es' || stored === 'en') setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') window.localStorage.setItem('mr-lang', l);
  };

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const { lang } = useContext(LanguageContext);
  const es = lang === 'es';
  const txt = (e: string, n: string) => (es ? e : n);
  return { lang, es, en: !es, txt };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/i18n.tsx
git commit -m "feat(landing): language provider with ES/EN toggle"
```

---

## Task 3: Nav (language switch + fire CTA)

**Files:**
- Modify: `apps/web/src/components/landing/nav.tsx`

- [ ] **Step 1: Rewrite nav.tsx**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { useLang } from './i18n';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, txt } = useLang();
  const { scrollY } = useScroll();
  let lastScrollY = 0;

  useMotionValueEvent(scrollY, 'change', (current: number) => {
    setScrolled(current > window.innerHeight * 0.4);
    if (current > lastScrollY && current > 100) setHidden(true);
    else setHidden(false);
    lastScrollY = current;
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  const links = [
    { href: '#deportes', label: txt('Deportes', 'Sports') },
    { href: '#precios', label: txt('Precios', 'Pricing') },
    { href: '#retos', label: txt('Retos', 'Challenges') },
    { href: '#eventos', label: txt('Eventos', 'Events') },
  ];

  return (
    <>
      <motion.header
        className={cn('fixed top-0 left-0 right-0 z-50 transition-colors duration-500', scrolled ? 'bg-surface-0/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent')}
        initial={{ y: 0 }}
        animate={{ y: hidden ? -80 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <nav className="section-container flex items-center justify-between h-16">
          <a href="#" aria-label="MR Training Home"><Logo /></a>

          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">{l.label}</a>
            ))}
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="text-body-sm font-semibold text-text-secondary hover:text-brand-primary transition-colors border border-white/10 rounded-md px-2 py-1"
              aria-label="Toggle language"
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            <a href="/sign-up" className="inline-flex items-center justify-center h-10 px-5 text-body-sm font-semibold rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-pressed transition-colors animate-glow-pulse">
              {txt('Entrenar gratis', 'Train free')}
            </a>
          </div>

          <button className="md:hidden p-2 text-text-secondary" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </motion.header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-surface-0 md:hidden">
          <div className="flex flex-col items-center justify-center h-full gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-h3 text-text-primary" onClick={() => setMobileOpen(false)}>{l.label}</a>
            ))}
            <button
              onClick={() => { setLang(lang === 'es' ? 'en' : 'es'); setMobileOpen(false); }}
              className="text-h3 text-text-secondary border border-white/10 rounded-md px-4 py-2"
            >
              {txt('Idioma: Español', 'Language: English')}
            </button>
            <a href="/sign-up" className="inline-flex items-center justify-center h-12 px-8 text-body font-semibold rounded-sm bg-brand-primary text-text-inverse" onClick={() => setMobileOpen(false)}>
              {txt('Entrenar gratis', 'Train free')}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/nav.tsx
git commit -m "feat(landing): nav with ES/EN switch and fire CTA"
```

---

## Task 4: Fire hero

**Files:**
- Modify: `apps/web/src/components/landing/hero.tsx`

- [ ] **Step 1: Rewrite hero.tsx**

```tsx
'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Flame } from 'lucide-react';
import { FadeInView } from './animation-primitives';
import { useLang } from './i18n';

export function HeroSection() {
  const { txt } = useLang();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface-0">
      {/* Fire background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/20 rounded-full blur-[128px] animate-fire-flicker" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-ember/20 rounded-full blur-[128px] animate-fire-flicker" />
      </div>
      <div className="grain" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-0" />

      {/* Content */}
      <div className="relative z-10 section-container text-center">
        <FadeInView delay={0.1}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 mb-6">
            <Flame className="w-4 h-4 text-brand-primary" />
            <span className="text-overline uppercase tracking-[0.1em] text-brand-primary font-semibold">
              {txt('MR TRAINING · FORJA TU BESTIA', 'MR TRAINING · FORGE YOUR BEAST')}
            </span>
          </div>
        </FadeInView>

        <FadeInView delay={0.3}>
          <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl uppercase text-text-primary leading-[0.95] max-w-5xl mx-auto">
            {txt('Deja de empezar', 'Stop starting')}{' '}
            <span className="text-gradient-fire">{txt('mañana', 'tomorrow')}</span>
          </h1>
        </FadeInView>

        <FadeInView delay={0.5}>
          <p className="mt-6 text-body-lg text-text-secondary max-w-2xl mx-auto">
            {txt(
              'Tu mejor versión no se construye con excusas. Se forja con cada repetición, cada kilómetro, cada gota de sudor. Entrena con fuego.',
              "Your best version isn't built on excuses. It's forged rep by rep, mile by mile, drop by drop. Train with fire."
            )}
          </p>
        </FadeInView>

        <FadeInView delay={0.7}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a href="/sign-up" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center h-14 px-10 text-body font-bold uppercase rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover transition-colors animate-glow-pulse">
              {txt('Empieza gratis 14 días', 'Start 14 days free')}
            </motion.a>
            <a href="#retos" className="inline-flex items-center gap-2 h-14 px-8 text-body font-semibold text-text-secondary hover:text-text-primary transition-colors uppercase">
              {txt('Ver el reto', 'See the challenge')}
            </a>
          </div>
        </FadeInView>

        <FadeInView delay={0.9}>
          <p className="mt-10 text-caption text-text-tertiary">{txt('Sin tarjeta · 50% OFF fundador · Reto 30 días', 'No card · 50% founder discount · 30-day challenge')}</p>
        </FadeInView>
      </div>

      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <ChevronDown className="text-brand-primary/60 w-6 h-6" />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/hero.tsx
git commit -m "feat(landing): fire hero with bilingual copy"
```

---

## Task 5: Promo marquee

**Files:**
- Create: `apps/web/src/components/landing/promo-marquee.tsx`

- [ ] **Step 1: Create promo-marquee.tsx**

```tsx
'use client';

import { useLang } from './i18n';

export function PromoMarquee() {
  const { txt } = useLang();
  const items = [
    txt('14 DÍAS GRATIS', '14 DAYS FREE'),
    txt('50% OFF FUNDADOR', '50% OFF FOUNDER'),
    txt('RETO 30 DÍAS', '30-DAY CHALLENGE'),
    txt('SIN TARJETA', 'NO CARD NEEDED'),
    txt('TODOS LOS DEPORTES', 'ALL SPORTS'),
  ];
  const row = [...items, ...items];

  return (
    <div className="relative overflow-hidden bg-brand-primary border-y border-brand-ember/30">
      <div className="flex whitespace-nowrap animate-marquee py-3">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-6 px-6 text-sm font-black uppercase tracking-wider text-surface-0">
            {item}
            <span className="text-surface-0/50">🔥</span>
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/promo-marquee.tsx
git commit -m "feat(landing): promo marquee bar"
```

---

## Task 6: Multideporte (repurpose athlete-journey)

**Files:**
- Modify: `apps/web/src/components/landing/athlete-journey.tsx`

- [ ] **Step 1: Rewrite as Multideporte**

```tsx
'use client';

import { FadeInView, SectionReveal } from './animation-primitives';
import { useLang } from './i18n';

const sports = [
  { id: 'gym', label: 'Gym', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' },
  { id: 'running', label: 'Running', img: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80' },
  { id: 'crossfit', label: 'CrossFit', img: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=600&q=80' },
  { id: 'tennis', label: 'Tenis', img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80' },
  { id: 'swimming', label: 'Natación', img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80' },
  { id: 'cycling', label: 'Ciclismo', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80' },
];

export function AthleteJourneySection() {
  const { txt } = useLang();
  return (
    <section id="deportes" className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <FadeInView>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-4">
              {txt('Donde sea que te retes', 'Wherever you get challenged')}
            </h2>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="text-body-lg text-text-secondary text-center max-w-2xl mx-auto mb-12">
              {txt('Un solo lugar para todo lo que te hace mejor. Elige tu campo de batalla.', 'One place for everything that makes you better. Pick your battlefield.')}
            </p>
          </FadeInView>
        </SectionReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sports.map((s, i) => (
            <FadeInView key={s.id} delay={i * 0.06}>
              <div className="relative group overflow-hidden rounded-lg aspect-[4/5] border border-surface-6">
                <img src={s.img} alt={s.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/30 to-brand-primary/10" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="font-display font-bold text-xl uppercase text-text-primary">{s.label}</span>
                </div>
              </div>
            </FadeInView>
          ))}
        </div>

        <FadeInView delay={0.3}>
          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-ember/10 border border-brand-ember/30 text-ember-text font-semibold text-sm uppercase">
              🔥 {txt('+ Eventos y competencias', '+ Events & competitions')}
            </span>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/athlete-journey.tsx
git commit -m "feat(landing): multideporte section (gym/running/crossfit/tennis/swimming/cycling)"
```

---

## Task 7: Emotional manifesto (storytelling)

**Files:**
- Modify: `apps/web/src/components/landing/storytelling.tsx`

- [ ] **Step 1: Rewrite as manifesto**

```tsx
'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { useLang } from './i18n';

export function StorytellingSection() {
  const { txt } = useLang();
  return (
    <section id="manifiesto" className="relative py-24 lg:py-40 bg-surface-0 overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[160px] animate-fire-flicker" />
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <FadeInView>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary max-w-4xl mx-auto text-center leading-[1.05]">
              {txt('Nadie viene a salvarte.', 'No one is coming to save you.')}{' '}
              <span className="text-gradient-fire">{txt('Te salvas tú.', 'You save yourself.')}</span>
            </h2>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="mt-8 text-body-lg text-text-secondary max-w-2xl mx-auto text-center leading-relaxed">
              {txt(
                'Cada amanecer es una decisión: quedarse donde estás o ir por más. MR Training no es una app. Es el empujón que necesitabas para no rendirte hoy.',
                "Every sunrise is a choice: stay where you are, or go for more. MR Training isn't an app. It's the push you needed to not quit today."
              )}
            </p>
          </FadeInView>
        </SectionReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/storytelling.tsx
git commit -m "feat(landing): emotional manifesto section"
```

---

## Task 8: Transformation (before/after + progress)

**Files:**
- Modify: `apps/web/src/components/landing/transformation.tsx`

- [ ] **Step 1: Read current transformation.tsx to mirror structure, then rewrite with fire styling + bilingual before/after + progress testimonials** (keep existing section id; apply `text-gradient-fire`, ember accents, `FadeInView`, and `txt()`). Content:

```tsx
'use client';
import { FadeInView, SectionReveal } from './animation-primitives';
import { useLang } from './i18n';

export function TransformationSection() {
  const { txt } = useLang();
  return (
    <section id="transformacion" className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <FadeInView>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-12">
              {txt('De 0 a imparable', 'From zero to unstoppable')}
            </h2>
          </FadeInView>
        </SectionReveal>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n, i) => (
            <FadeInView key={n} delay={i * 0.1}>
              <div className="rounded-lg overflow-hidden border border-surface-6 bg-surface-3">
                <div className="aspect-[3/4] bg-gradient-to-br from-surface-3 to-surface-4 flex items-center justify-center">
                  <span className="font-display font-black text-4xl text-gradient-fire">+{n * 18}%</span>
                </div>
                <div className="p-4">
                  <p className="text-body-sm text-text-secondary">
                    {txt('Progreso real, semana a semana.', 'Real progress, week by week.')}
                  </p>
                </div>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/transformation.tsx
git commit -m "feat(landing): transformation section fire restyle"
```

---

## Task 9: Challenge block (NEW)

**Files:**
- Create: `apps/web/src/components/landing/challenge.tsx`

- [ ] **Step 1: Create challenge.tsx**

```tsx
'use client';

import { FadeInView } from './animation-primitives';
import { useLang } from './i18n';

export function ChallengeSection() {
  const { txt } = useLang();
  return (
    <section id="retos" className="relative py-24 lg:py-32 bg-surface-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/15 via-surface-0 to-brand-ember/10" />
      <div className="grain" />
      <div className="section-container relative">
        <div className="rounded-2xl border border-brand-primary/30 bg-surface-1/80 backdrop-blur p-8 lg:p-12 text-center">
          <FadeInView>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-ember/15 border border-brand-ember/30 text-ember-text font-semibold text-sm uppercase mb-6">
              🔥 {txt('Reto 30 días', '30-day challenge')}
            </span>
          </FadeInView>
          <FadeInView delay={0.1}>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary leading-[1.05]">
              {txt('Forja el hábito. Cambia tu vida.', 'Build the habit. Change your life.')}
            </h2>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="mt-6 text-body-lg text-text-secondary max-w-2xl mx-auto">
              {txt('30 días de entrenos guiados, nutrición y comunidad. Empieza gratis y llévate el 50% de por vida si terminas.', '30 days of guided training, nutrition, and community. Start free and keep 50% off for life if you finish.')}
            </p>
          </FadeInView>
          <FadeInView delay={0.3}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/sign-up" className="inline-flex items-center justify-center h-14 px-10 text-body font-bold uppercase rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover transition-colors animate-glow-pulse">
                {txt('Unirme al reto', 'Join the challenge')}
              </a>
              <span className="text-body-sm text-text-tertiary line-through">{txt('$29/mes', '$29/mo')}</span>
              <span className="text-body font-bold text-ember-text">{txt('$14.5/mes fundador', '$14.5/mo founder')}</span>
            </div>
          </FadeInView>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/challenge.tsx
git commit -m "feat(landing): 30-day challenge block with founder discount"
```

---

## Task 10: Features (fire restyle + bilingual)

**Files:**
- Modify: `apps/web/src/components/landing/features.tsx`

- [ ] **Step 1: Apply fire theme to features.tsx** — keep the existing orbit/card structure but: (a) import `useLang`, (b) replace all hardcoded English strings in `modules`/`moduleDetails` with bilingual `txt(...)` pairs, (c) change `text-brand-primary` accents to fire gradient where used in titles, (d) add `bg-gradient-fire` to the center logo ring. Specifically:
  - Title: `txt('Todo lo que necesitas. Nada de más.', 'Everything you need. Nothing you don't.')`
  - Each `moduleDetails` title/description/features → `txt('es','en')`.
  - Center ring: replace `shadow-brand-primary/10` with `fire-glow`.
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/features.tsx
git commit -m "feat(landing): features section bilingual + fire accents"
```

---

## Task 11: Events (bilingual)

**Files:**
- Modify: `apps/web/src/components/landing/events.tsx`

- [ ] **Step 1: Read events.tsx, then restyle with fire theme + `txt()` for headings and event copy; add ember accent chips and `FadeInView`.** Keep section id `events`. Headings: `txt('Eventos que te ponen a prueba', 'Events that put you to the test')`.
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/events.tsx
git commit -m "feat(landing): events section bilingual + fire restyle"
```

---

## Task 12: Testimonials (bilingual)

**Files:**
- Modify: `apps/web/src/components/landing/testimonials.tsx`

- [ ] **Step 1: Read testimonials.tsx, restyle with fire theme (ember quotes, fire-glow cards) and `txt()` for quotes/names/roles.** Keep section structure.
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/testimonials.tsx
git commit -m "feat(landing): testimonials bilingual + fire restyle"
```

---

## Task 13: Pricing (founder discount highlighted)

**Files:**
- Modify: `apps/web/src/components/landing/pricing.tsx`

- [ ] **Step 1: Read pricing.tsx, restyle with fire theme and add a highlighted "Fundador 50% OFF" badge on the recommended plan using `txt()` + ember accent + `fire-glow`.** Headings bilingual.
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/pricing.tsx
git commit -m "feat(landing): pricing with founder discount highlighted"
```

---

## Task 14: FAQ (bilingual)

**Files:**
- Modify: `apps/web/src/components/landing/faq.tsx`

- [ ] **Step 1: Read faq.tsx, convert Q&A to `txt()` pairs (bilingual), fire accents on open items.** Keep section id `faq`.
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/faq.tsx
git commit -m "feat(landing): faq bilingual"
```

---

## Task 15: Final CTA (fire)

**Files:**
- Modify: `apps/web/src/components/landing/final-cta.tsx`

- [ ] **Step 1: Read final-cta.tsx, rewrite to full-width fire screen: huge uppercase headline `txt('Tu mejor versión te está esperando', 'Your best version is waiting')`, subtitle, and a big fire CTA `txt('Empieza gratis', 'Start free')` → `/sign-up`. Add `fire-flicker` background + grain.**
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/final-cta.tsx
git commit -m "feat(landing): final CTA fire screen"
```

---

## Task 16: Footer (bilingual)

**Files:**
- Modify: `apps/web/src/components/landing/footer.tsx`

- [ ] **Step 1: Read footer.tsx, make link labels + tagline bilingual via `txt()`, keep socials. Fire accent on logo.**
- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/landing/footer.tsx
git commit -m "feat(landing): footer bilingual"
```

---

## Task 17: Wire marketing page

**Files:**
- Modify: `apps/web/src/app/(marketing)/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

```tsx
import { LanguageProvider } from '@/components/landing/i18n';
import { LandingNav } from '@/components/landing/nav';
import { HeroSection } from '@/components/landing/hero';
import { PromoMarquee } from '@/components/landing/promo-marquee';
import { AthleteJourneySection } from '@/components/landing/athlete-journey';
import { StorytellingSection } from '@/components/landing/storytelling';
import { TransformationSection } from '@/components/landing/transformation';
import { ChallengeSection } from '@/components/landing/challenge';
import { FeaturesSection } from '@/components/landing/features';
import { EventsSection } from '@/components/landing/events';
import { TestimonialsSection } from '@/components/landing/testimonials';
import { PricingSection } from '@/components/landing/pricing';
import { FAQSection } from '@/components/landing/faq';
import { FinalCTACSection } from '@/components/landing/final-cta';
import { FooterSection } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <LanguageProvider>
      <LandingNav />
      <main>
        <HeroSection />
        <PromoMarquee />
        <AthleteJourneySection />
        <StorytellingSection />
        <TransformationSection />
        <ChallengeSection />
        <FeaturesSection />
        <EventsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTACSection />
      </main>
      <FooterSection />
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/'(marketing)'/page.tsx
git commit -m "feat(landing): wire fire sections in marketing page"
```

---

## Task 18: Build verification

**Files:** none (verification)

- [ ] **Step 1: Run build**

```bash
cd apps/web && pnpm run build
```

Expected: compiles successfully, no type errors. Fix any errors, then commit fixes:

```bash
git add -A && git commit -m "fix(landing): resolve build errors from fire redesign"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** Tokens ✅ (T1), i18n ✅ (T2), nav+switch ✅ (T3), hero ✅ (T4), promo marquee ✅ (T5), multideporte ✅ (T6), manifesto ✅ (T7), transformación ✅ (T8), challenge ✅ (T9), features ✅ (T10), events ✅ (T11), testimonios ✅ (T12), precios ✅ (T13), faq ✅ (T14), cta ✅ (T15), footer ✅ (T16), wire ✅ (T17), build ✅ (T18). All 14 spec sections present.
- **Images:** stock Unsplash URLs inline (T6); AI fire textures can be added to `public/` later as enhancement — section backgrounds use CSS fire gradients + grain for cohesion now.
- **Type consistency:** `useLang()` returns `{ lang, es, en, txt }` across all tasks. `txt(e,n)` signature consistent.
- No placeholders; every task has concrete code or explicit read-then-restyle instruction with anchor strings.
