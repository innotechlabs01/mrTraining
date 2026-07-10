# Landing Dark Gritty Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the MR Training landing page into a high-impact, image-driven gym experience with full-bleed athlete photography, fire ember particles, glow effects, and dramatic typography.

**Architecture:** Each component is a standalone `'use client'` file in `src/components/landing/`. A new reusable `FireParticles` canvas component will be shared by Hero and FinalCTA. CSS utilities in `globals.css`. All images use Unsplash URLs with dark overlay gradients.

**Tech Stack:** Next.js 14, Tailwind CSS 3.4, Framer Motion 11, Lucide React icons

---

### Task 1: CSS Utilities + FireParticles Component

**Files:**
- Modify: `src/app/globals.css` — add fire glow text, fire border, stronger grain utilities
- Create: `src/components/landing/fire-particles.tsx` — reusable canvas particle system

- [ ] **Step 1: Add new CSS utilities to globals.css**

Append before the `@layer utilities` closing:

```css
.text-glow-fire {
  text-shadow: 0 0 30px rgba(255, 107, 0, 0.4), 0 0 60px rgba(255, 107, 0, 0.2);
}

.fire-border-glow {
  box-shadow: 0 0 12px rgba(255, 107, 0, 0.3), inset 0 0 12px rgba(255, 107, 0, 0.05);
}

.fire-gradient-bg {
  background: linear-gradient(90deg, rgba(255, 107, 0, 0.15), transparent, rgba(255, 107, 0, 0.15));
}

.grain-strong {
  opacity: 0.12;
}
```

- [ ] **Step 2: Create FireParticles component**

Create `src/components/landing/fire-particles.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  hue: number;
}

interface FireParticlesProps {
  count?: number;
  speed?: number;
  className?: string;
}

export function FireParticles({ count = 80, speed = 1, className }: FireParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      speedX: (Math.random() - 0.5) * 0.4 * speed,
      speedY: -(Math.random() * 0.8 + 0.3) * speed,
      hue: Math.random() > 0.3 ? 25 : 0,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity = Math.max(0, p.opacity - 0.001);
        if (p.y < -10 || p.opacity <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 50;
          p.opacity = Math.random() * 0.6 + 0.2;
          p.size = Math.random() * 3 + 1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        if (p.hue === 0) {
          ctx.fillStyle = `rgba(255, ${107 + Math.random() * 80}, 0, ${p.opacity})`;
        } else {
          ctx.fillStyle = `rgba(255, ${150 + Math.random() * 60}, ${Math.random() * 50}, ${p.opacity * 0.7})`;
        }
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [count, speed]);

  return <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`} aria-hidden="true" />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/landing/fire-particles.tsx
git commit -m "feat(landing): add FireParticles component and fire CSS utilities"
```

---

### Task 2: Hero — Full-bleed image + particles

**Files:**
- Rewrite: `src/components/landing/hero.tsx`

- [ ] **Step 1: Rewrite HeroSection**

Replace entire hero.tsx content:

```tsx
'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Flame } from 'lucide-react';
import { FadeInView } from './animation-primitives';
import { FireParticles } from './fire-particles';
import { useLang } from './i18n';

export function HeroSection() {
  const { txt } = useLang();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface-0">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=85"
          alt="Athlete training with intensity"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-0/90 via-surface-0/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface-0/20 via-transparent to-surface-0/80" />
      </div>
      <div className="grain" />
      <FireParticles count={100} speed={1.2} />

      <div className="relative z-10 section-container text-center">
        <FadeInView delay={0.1}>
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/15 border border-brand-primary/40 mb-6"
            animate={{ boxShadow: ['0 0 0px rgba(255,107,0,0.3)', '0 0 20px rgba(255,107,0,0.5)', '0 0 0px rgba(255,107,0,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Flame className="w-4 h-4 text-brand-primary" />
            <span className="text-overline uppercase tracking-[0.12em] text-brand-primary font-bold">
              {txt('MR TRAINING · FORJA TU BESTIA', 'MR TRAINING · FORGE YOUR BEAST')}
            </span>
          </motion.div>
        </FadeInView>

        <FadeInView delay={0.3}>
          <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl uppercase leading-[0.9] max-w-5xl mx-auto text-glow-fire">
            {txt('Deja de empezar', 'Stop starting')}{' '}
            <span className="text-gradient-fire">{txt('mañana', 'tomorrow')}</span>
          </h1>
        </FadeInView>

        <FadeInView delay={0.5}>
          <p className="mt-6 text-body-lg text-text-secondary/90 max-w-2xl mx-auto font-semibold tracking-wide">
            {txt(
              'Tu mejor versión no se construye con excusas. Se forja con cada repetición, cada kilómetro, cada gota de sudor. Entrena con fuego.',
              "Your best version isn't built on excuses. It's forged rep by rep, mile by mile, drop by drop. Train with fire."
            )}
          </p>
        </FadeInView>

        <FadeInView delay={0.7}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="/sign-up"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center h-14 px-10 text-body font-bold uppercase tracking-widest rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover transition-all animate-glow-pulse fire-border-glow"
            >
              {txt('Empieza gratis 14 días', 'Start 14 days free')}
            </motion.a>
            <a
              href="#retos"
              className="inline-flex items-center gap-2 h-14 px-8 text-body font-bold text-text-secondary hover:text-text-primary transition-colors uppercase tracking-widest"
            >
              {txt('Ver el reto', 'See the challenge')}
            </a>
          </div>
        </FadeInView>

        <FadeInView delay={0.9}>
          <p className="mt-10 text-caption text-text-tertiary/80 uppercase tracking-wider">
            {txt('Sin tarjeta · 50% OFF fundador · Reto 30 días', 'No card · 50% founder discount · 30-day challenge')}
          </p>
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
git add src/components/landing/hero.tsx
git commit -m "feat(landing): rewrite hero with full-bleed athlete image and fire particles"
```

---

### Task 3: PromoMarquee — Larger font + fire gradient

**Files:**
- Modify: `src/components/landing/promo-marquee.tsx`

- [ ] **Step 1: Read current file, then update styling**

Read the file first, then add `fire-gradient-bg` class to the section and increase font size. Add flame separator icons between items.

```tsx
// Add to section className:
<section className="relative py-4 fire-gradient-bg overflow-hidden border-y border-brand-primary/10">

// Update the text items loop — add gap-8 and flame separator:
<div className="flex gap-8 items-center text-body font-black uppercase tracking-[0.15em] text-brand-primary/80">
  {items.concat(items).map((item, i) => (
    <span key={i} className="flex items-center gap-8 whitespace-nowrap">
      <span>{item}</span>
      <Flame className="w-4 h-4 text-brand-primary/40" />
    </span>
  ))}
</div>
```

Also add Flame import to the top.

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/promo-marquee.tsx
git commit -m "feat(landing): enhance promo marquee with fire gradient and flame separators"
```

---

### Task 4: AthleteJourney — Asymmetric grid + larger images

**Files:**
- Rewrite: `src/components/landing/athlete-journey.tsx`

- [ ] **Step 1: Rewrite AthleteJourneySection**

Replace the file. Key changes:
- Use `w=800&q=85` instead of `w=600&q=80` for higher quality
- Make the 6-image grid asymmetric: first image spans 2 rows (col-span-2 row-span-2), rest are standard
- Add fire glow on hover (border + box-shadow)
- Athlete role circles larger (w-32 h-32) with glow ring
- More dramatic overlay gradients

```tsx
'use client';

import { FadeInView, SectionReveal } from './animation-primitives';
import { motion } from 'framer-motion';
import { useLang } from './i18n';

const sports = [
  { id: 'gym', label: 'Gym', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85', span: 'md:col-span-2 md:row-span-2' },
  { id: 'running', label: 'Running', img: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=85', span: '' },
  { id: 'crossfit', label: 'CrossFit', img: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=85', span: '' },
  { id: 'tennis', label: 'Tenis', img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=85', span: '' },
  { id: 'swimming', label: 'Natación', img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=85', span: '' },
  { id: 'cycling', label: 'Ciclismo', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=85', span: '' },
];

const athleteImages = [
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=85',
  'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=85',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=85',
];

export function AthleteJourneySection() {
  const { txt } = useLang();
  const athleteLabels = [txt('Atleta', 'Athlete'), txt('Coach', 'Coach'), txt('Comunidad', 'Community')];

  return (
    <section id="deportes" className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <FadeInView>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-4 tracking-wide">
              {txt('Donde sea que te retes', 'Wherever you get challenged')}
            </h2>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="text-body-lg text-text-secondary text-center max-w-2xl mx-auto mb-12">
              {txt('Un solo lugar para todo lo que te hace mejor. Elige tu campo de batalla.', 'One place for everything that makes you better. Pick your battlefield.')}
            </p>
          </FadeInView>
        </SectionReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[200px] md:auto-rows-[240px]">
          {sports.map((s, i) => (
            <FadeInView key={s.id} delay={i * 0.06}>
              <motion.div
                className={`relative group overflow-hidden rounded-lg border border-surface-6 ${s.span || 'col-span-1 row-span-1'}`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img src={s.img} alt={s.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-brand-primary/10" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="font-display font-black text-2xl uppercase text-text-primary tracking-wider drop-shadow-lg">{s.label}</span>
                </div>
              </motion.div>
            </FadeInView>
          ))}
        </div>

        <FadeInView delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {athleteImages.map((img, i) => (
              <motion.div
                key={i}
                className="relative group overflow-hidden rounded-full w-24 h-24 md:w-32 md:h-32 border-2 border-surface-6"
                whileHover={{ scale: 1.08, borderColor: '#FF6B00' }}
                transition={{ duration: 0.2 }}
              >
                <img src={img} alt={athleteLabels[i]} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0/60 to-transparent rounded-full" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold uppercase text-text-primary tracking-wider drop-shadow-lg">{athleteLabels[i]}</span>
                </div>
              </motion.div>
            ))}
            <motion.span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand-ember/15 border border-brand-ember/40 text-ember-text font-bold text-sm uppercase tracking-wider"
              animate={{ boxShadow: ['0 0 0px rgba(255,179,0,0.2)', '0 0 16px rgba(255,179,0,0.4)', '0 0 0px rgba(255,179,0,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🔥 {txt('+ Eventos y competencias', '+ Events & competitions')}
            </motion.span>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/athlete-journey.tsx
git commit -m "feat(landing): rewrite athlete journey with asymmetric grid and larger images"
```

---

### Task 5: Storytelling — Split screen with athlete photo

**Files:**
- Rewrite: `src/components/landing/storytelling.tsx`

- [ ] **Step 1: Rewrite StorytellingSection**

Replace file content:

```tsx
'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { useLang } from './i18n';

export function StorytellingSection() {
  const { txt } = useLang();
  return (
    <section id="manifiesto" className="relative py-24 lg:py-0 bg-surface-0 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[60vh] lg:min-h-[80vh]">
            <FadeInView direction="left" className="py-16 lg:py-24">
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase leading-[1.05] tracking-wide">
                {txt('Nadie viene a salvarte.', 'No one is coming to save you.')}
              </h2>
              <div className="w-16 h-1 bg-gradient-fire rounded-full my-6" />
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase leading-[1.05] text-gradient-fire tracking-wide">
                {txt('Te salvas tú.', 'You save yourself.')}
              </h2>
              <p className="mt-8 text-body-lg text-text-secondary max-w-xl leading-relaxed">
                {txt(
                  'Cada amanecer es una decisión: quedarse donde estás o ir por más. MR Training no es una app. Es el empujón que necesitabas para no rendirte hoy.',
                  "Every sunrise is a choice: stay where you are, or go for more. MR Training isn't an app. It's the push you needed to not quit today."
                )}
              </p>
            </FadeInView>
            <FadeInView direction="right" className="relative h-[50vh] lg:h-full min-h-[400px] rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=85"
                alt="Athlete in moments of intense effort"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-0/40 to-transparent" />
            </FadeInView>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/storytelling.tsx
git commit -m "feat(landing): rewrite storytelling as split-screen with athlete photo"
```

---

### Task 6: Transformation + Challenge — Photo backgrounds

**Files:**
- Modify: `src/components/landing/transformation.tsx`
- Modify: `src/components/landing/challenge.tsx`

- [ ] **Step 1: Rewrite TransformationSection**

Replace file:

```tsx
'use client';

import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { useLang } from './i18n';

const cardImages = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80',
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=500&q=80',
  'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=500&q=80',
];

export function TransformationSection() {
  const { txt } = useLang();
  const cards = [
    { pct: 18, label: txt('Fuerza', 'Strength') },
    { pct: 36, label: txt('Resistencia', 'Endurance') },
    { pct: 54, label: txt('Confianza', 'Confidence') },
  ];
  return (
    <section id="transformacion" className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <FadeInView>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-12 tracking-wide">
              {txt('De 0 a imparable', 'From zero to unstoppable')}
            </h2>
          </FadeInView>
        </SectionReveal>
        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <FadeInView key={c.label} delay={i * 0.1}>
              <motion.div
                className="relative group rounded-lg overflow-hidden border border-surface-6"
                whileHover={{ y: -6, boxShadow: '0 0 30px rgba(255,107,0,0.3)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="aspect-[3/4] relative">
                  <img src={cardImages[i]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/60 to-surface-0/20" />
                  <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display font-black text-6xl lg:text-7xl text-gradient-fire drop-shadow-lg">+{c.pct}%</span>
                  </div>
                </div>
                <div className="p-4 bg-surface-3">
                  <p className="text-body-sm text-text-secondary text-center uppercase tracking-wider font-semibold">
                    {txt('Progreso real, semana a semana.', 'Real progress, week by week.')}
                  </p>
                  <p className="text-center font-display font-bold text-h4 text-gradient-fire mt-1">{c.label}</p>
                </div>
              </motion.div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite ChallengeSection**

Replace file:

```tsx
'use client';

import { motion } from 'framer-motion';
import { FadeInView } from './animation-primitives';
import { useLang } from './i18n';

export function ChallengeSection() {
  const { txt } = useLang();
  return (
    <section id="retos" className="relative py-24 lg:py-32 bg-surface-0 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=85"
          alt="Group of athletes training together"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-0 via-surface-0/80 to-surface-0/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-transparent to-surface-0/40" />
      </div>
      <div className="grain" />
      <div className="section-container relative">
        <div className="relative rounded-2xl border border-brand-primary/30 bg-surface-1/60 backdrop-blur-md p-8 lg:p-14 text-center max-w-3xl mx-auto">
          <FadeInView>
            <motion.span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-ember/20 border border-brand-ember/40 text-ember-text font-bold text-sm uppercase tracking-wider mb-6"
              animate={{ boxShadow: ['0 0 0px rgba(255,179,0,0.2)', '0 0 16px rgba(255,179,0,0.4)', '0 0 0px rgba(255,179,0,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🔥 {txt('Reto 30 días', '30-day challenge')}
            </motion.span>
          </FadeInView>
          <FadeInView delay={0.1}>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase leading-[1.05] tracking-wide text-text-primary">
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
              <motion.a
                href="/sign-up"
                className="inline-flex items-center justify-center h-14 px-10 text-body font-bold uppercase tracking-widest rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover transition-all animate-glow-pulse fire-border-glow"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                {txt('Unirme al reto', 'Join the challenge')}
              </motion.a>
              <span className="text-body-sm text-text-tertiary line-through">{txt('$29/mes', '$29/mo')}</span>
              <span className="text-body font-bold text-ember-text text-glow-fire">{txt('$14.5/mes fundador', '$14.5/mo founder')}</span>
            </div>
          </FadeInView>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/transformation.tsx src/components/landing/challenge.tsx
git commit -m "feat(landing): add photo backgrounds to transformation and challenge sections"
```

---

### Task 7: Features — Icon glow + orbit enhancements

**Files:**
- Modify: `src/components/landing/features.tsx`

- [ ] **Step 1: Update FeaturesSection**

Read current file. Changes:
- Add `import { motion } from 'framer-motion'` (already imported)
- Add glow to orbit rings: replace `border-surface-6/50` with `border-brand-primary/10` for inner orbits
- Add glow to center logo: enhance fire-glow
- Icon hover glow effect: on hover, add fire-border-glow class to icon container
- Make detail panel border glow stronger
- Add background texture to section
- Import `FireParticles` and add subtle particles (count={20}) in background

Add particle background to section:
```tsx
<FireParticles count={20} speed={0.5} />
```

Update orbit ring styling:
```tsx
style={{ width: r * 2, height: r * 2, borderColor: `rgba(255, 107, 0, ${0.05 + i * 0.03})` }}
```

Update center logo div for stronger glow:
```tsx
<div className="w-20 h-20 rounded-full bg-surface-3 border border-brand-primary/50 flex items-center justify-center" style={{ boxShadow: '0 0 40px rgba(255,107,0,0.3), 0 0 80px rgba(255,107,0,0.1)' }}>
```

Update icon containers to show glow on active/hover:
```tsx
className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
  activeModule === mod.id
    ? 'bg-brand-primary/20 border border-brand-primary fire-border-glow'
    : 'bg-surface-3 border border-surface-6 group-hover:border-brand-primary/50 group-hover:shadow-[0_0_16px_rgba(255,107,0,0.2)]'
}`}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/features.tsx
git commit -m "feat(landing): enhance features orbit with glow effects and subtle particles"
```

---

### Task 8: Events + Testimonials — Photos + glow

**Files:**
- Modify: `src/components/landing/events.tsx`
- Rewrite: `src/components/landing/testimonials.tsx`

- [ ] **Step 1: Rewrite EventsSection**

Add image URLs array and replace the card render. Each event card now has a photo background with overlay. Replace the events.tsx content with:

```tsx
'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { useLang } from './i18n';

const events = [
  {
    nameEs: 'Torneo Abril Open',
    nameEn: 'Spring Open Tournament',
    sportEs: 'Tenis',
    sportEn: 'Tennis',
    date: 'Abr 10–12, 2026',
    locationEs: 'City Tennis Center',
    locationEn: 'City Tennis Center',
    registered: 48,
    img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=85',
  },
  {
    nameEs: 'Campamento Élite',
    nameEn: 'Elite Training Camp',
    sportEs: 'Multideporte',
    sportEn: 'Multi-Sport',
    date: 'Jul 5–12, 2026',
    locationEs: 'Mountain Performance Center',
    locationEn: 'Mountain Performance Center',
    registered: 24,
    img: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=85',
  },
];

export function EventsSection() {
  const { txt } = useLang();
  return (
    <section id="eventos" className="relative py-24 lg:py-32 overflow-hidden bg-surface-1">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-ember/10 rounded-full blur-[128px] animate-fire-flicker" />
      <div className="grain" />
      <div className="section-container relative z-10">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4 tracking-wide">
                {txt('Competencias. Campamentos. Meetups.', 'Competitions. Camps. Meetups.')}{' '}
                <span className="text-gradient-fire">{txt('Todo en uno.', 'All in one place.')}</span>
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                {txt('Registro, waivers, agenda y resultados incluidos. No atornillados.', 'Registration, waivers, scheduling, and results — built in, not bolted on.')}
              </p>
            </FadeInView>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {events.map((event, i) => (
              <FadeInView key={event.nameEn} delay={i * 0.2}>
                <motion.div
                  className="relative group rounded-xl overflow-hidden border border-surface-6 hover:border-brand-primary/40 transition-all duration-500"
                  style={{ minHeight: '340px' }}
                  whileHover={{ y: -4 }}
                >
                  <img src={event.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/70 to-surface-0/30" />
                  <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: 'inset 0 0 40px rgba(255,107,0,0.15)' }} />
                  <div className="relative z-10 p-6 flex flex-col justify-end h-full min-h-[340px]">
                    <span className="font-display text-overline text-brand-primary uppercase tracking-[0.12em] font-bold">
                      {txt(event.sportEs, event.sportEn)}
                    </span>
                    <h3 className="font-display font-bold text-h3 text-text-primary mt-2 mb-4 drop-shadow-lg">
                      {txt(event.nameEs, event.nameEn)}
                    </h3>
                    <div className="space-y-2 text-body-sm text-text-secondary/90">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-brand-primary" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-brand-primary" />
                        {txt(event.locationEs, event.locationEn)}
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-brand-primary" />
                        {event.registered} {txt('Inscritos', 'Registered')}
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <a href="/sign-up" className="text-body-sm font-bold text-brand-primary hover:text-brand-primary-hover transition-colors uppercase tracking-wider">
                        {txt('Inscríbete →', 'Register Now →')}
                      </a>
                    </div>
                  </div>
                </motion.div>
              </FadeInView>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite TestimonialsSection**

Replace file content with version that uses real Unsplash athlete portrait photos:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { useLang } from './i18n';

const testimonials = [
  {
    name: 'Sarah Chen',
    roleEs: 'Coach Jefa, Peak Performance',
    roleEn: 'Head Coach, Peak Performance',
    img: 'https://images.unsplash.com/photo-1517840901100-8179e98271b7?w=200&q=85',
    quoteEs: 'MR Training reemplazó 5 herramientas. La retención subió de 72% a 94% en 3 meses. La IA me ahorra 10 horas semanales.',
    quoteEn: 'MR Training replaced 5 tools. Retention went from 72% to 94% in 3 months. The AI saves me 10 hours a week.',
    metric: { labelEs: '94% retención', labelEn: '94% retention', color: 'text-success' },
  },
  {
    name: 'Marcus Rivera',
    roleEs: 'Triatleta Olímpico',
    roleEn: 'Olympic Triathlete',
    img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=85',
    quoteEs: 'Mi entrenador y yo por fin estamos en la misma página. Mi 10K bajó de 14:20 a 12:30 esta temporada.',
    quoteEn: 'My coach and I are finally on the same page. My 10K dropped from 14:20 to 12:30 this season.',
    metric: { labelEs: '12:30 10K PR', labelEn: '12:30 10K PR', color: 'text-brand-primary' },
  },
  {
    name: 'James Park',
    roleEs: 'Director, Elite Tennis',
    roleEn: 'Academy Director, Elite Tennis',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=85',
    quoteEs: 'De hojas de cálculo a un sistema real. 300 atletas, 12 coaches, cero caos.',
    quoteEn: 'From spreadsheets to a real system. 300 athletes, 12 coaches, zero chaos.',
    metric: { labelEs: '300 atletas', labelEn: '300 athletes', color: 'text-brand-secondary' },
  },
  {
    name: 'Lisa Thompson',
    roleEs: 'Nutricionista Deportiva',
    roleEn: 'Sports Nutritionist',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=85',
    quoteEs: 'Veo la carga de entreno junto a la comida. Planes que complementan el entreno.',
    quoteEn: 'I can see training load alongside food logs. Nutrition that supports training.',
    metric: { labelEs: '85+ clientes', labelEn: '85+ clients', color: 'text-violet-accent' },
  },
  {
    name: 'David Kim',
    roleEs: 'Coach de Running',
    roleEn: 'Running Coach, Track Club',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=85',
    quoteEs: 'La detección de anomalías evitó dos lesiones antes de que pasaran.',
    quoteEn: 'Anomaly detection caught two overtraining cases before injuries happened.',
    metric: { labelEs: '2 lesiones evitadas', labelEn: '2 injuries prevented', color: 'text-warning' },
  },
];

export function TestimonialsSection() {
  const { txt } = useLang();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4 tracking-wide">
                {txt('Coaches que exigen resultados.', 'Coaches who demand results.')}
              </h2>
            </FadeInView>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className="p-8 md:p-12 rounded-xl bg-surface-3 border border-brand-primary/30"
                  style={{ boxShadow: '0 0 30px rgba(255,107,0,0.15)' }}
                >
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-brand-primary/50">
                      <img src={testimonials[currentIndex].img} alt={testimonials[currentIndex].name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-body text-text-primary">{testimonials[currentIndex].name}</p>
                      <p className="text-body-sm text-text-tertiary">{txt(testimonials[currentIndex].roleEs, testimonials[currentIndex].roleEn)}</p>
                    </div>
                  </div>
                  <p className="text-body-lg text-text-secondary mb-6 leading-relaxed">
                    &ldquo;{txt(testimonials[currentIndex].quoteEs, testimonials[currentIndex].quoteEn)}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`font-display font-black text-h3 text-gradient-fire`}>
                      {txt(testimonials[currentIndex].metric.labelEs, testimonials[currentIndex].metric.labelEn)}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, i) => (
                  <motion.button
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-10 bg-brand-primary' : 'w-2 bg-surface-5 hover:bg-surface-4'}`}
                    onClick={() => setCurrentIndex(i)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/events.tsx src/components/landing/testimonials.tsx
git commit -m "feat(landing): add photo backgrounds to events and real photos to testimonials"
```

---

### Task 9: Nav + Pricing + FAQ + Footer — Glow enhancements

**Files:**
- Modify: `src/components/landing/pricing.tsx`
- Modify: `src/components/landing/faq.tsx`
- Modify: `src/components/landing/footer.tsx`

- [ ] **Step 1: Update LandingNav**

Changes (in nav.tsx):
- Add subtle fire glow to the sign-up CTA button: add `fire-border-glow` class
- Add hover glow to logo link: wrap in a motion.div with `whileHover` adding a fire glow effect

Edit the CTA button in nav.tsx:
```tsx
<a href="/sign-up" className="inline-flex items-center justify-center h-10 px-5 text-body-sm font-semibold rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-pressed transition-colors animate-glow-pulse fire-border-glow">
  {txt('Entrenar gratis', 'Train free')}
</a>
```

- [ ] **Step 2: Update PricingSection**

Changes:
- Add animated glow to the Pro plan badge
- Add subtle gym texture background to section
- Enhance fire glow on the Pro card

In pricing.tsx, update the Pro badge:
```tsx
{plan.highlight && (
  <motion.div
    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-brand-primary text-body-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
    animate={{ boxShadow: ['0 0 0px rgba(255,107,0,0.4)', '0 0 20px rgba(255,107,0,0.6)', '0 0 0px rgba(255,107,0,0.4)'] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
  >
    🔥 {txt('Fundador 50% OFF', 'Founder 50% OFF')}
  </motion.div>
)}
```

Add `motion` import if not already present.

Update Pro card border:
```tsx
plan.highlight
  ? 'bg-surface-4 border-brand-primary fire-border-glow'
  : 'bg-surface-3 border-surface-6 hover:border-surface-5'
```

- [ ] **Step 3: Update FAQSection**

Changes:
- Add glow border to open accordion items
- Read the current file first

In the FAQ component, when an item is open, add glow styling:
```tsx
<div
  className={`rounded-lg border transition-all duration-300 ${
    openIndex === i
      ? 'border-brand-primary/40 fire-border-glow'
      : 'border-surface-6 hover:border-surface-5'
  }`}
>
```

- [ ] **Step 4: Update FooterSection**

Changes:
- Add fire gradient top border
- Logo gets subtle glow

In footer.tsx, update the footer container:
```tsx
<footer className="relative bg-surface-0 border-t border-transparent" style={{ borderTop: '1px solid rgba(255,107,0,0.15)', boxShadow: '0 -1px 20px rgba(255,107,0,0.08)' }}>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/nav.tsx src/components/landing/pricing.tsx src/components/landing/faq.tsx src/components/landing/footer.tsx
git commit -m "feat(landing): add glow effects to nav, pricing, faq, and footer"
```

---

### Task 10: FinalCTA — Hero image + dense particles

**Files:**
- Rewrite: `src/components/landing/final-cta.tsx`

- [ ] **Step 1: Rewrite FinalCTACSection**

Replace file content:

```tsx
'use client';

import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { FireParticles } from './fire-particles';
import { ArrowRight, Flame } from 'lucide-react';
import { useLang } from './i18n';

export function FinalCTACSection() {
  const { txt } = useLang();

  return (
    <section id="cta" className="relative py-32 lg:py-48 bg-surface-0 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=85"
          alt="Athlete celebrating achievement"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-0 via-surface-0/70 to-surface-0/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/20 to-transparent" />
      </div>
      <FireParticles count={120} speed={1.5} />
      <div className="grain" />

      <div className="section-container relative z-10">
        <SectionReveal>
          <div className="max-w-3xl mx-auto text-center">
            <FadeInView>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-bold text-body-sm uppercase tracking-wider mb-6"
                animate={{ boxShadow: ['0 0 0px rgba(255,107,0,0.3)', '0 0 20px rgba(255,107,0,0.5)', '0 0 0px rgba(255,107,0,0.3)'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="w-4 h-4" />
                {txt('Empieza gratis 14 días', 'Start your 14-day free trial')}
              </motion.div>
            </FadeInView>

            <FadeInView delay={0.1}>
              <h2 className="font-display font-black text-h1 lg:text-[5rem] leading-[0.9] text-text-primary mb-6 uppercase tracking-wide text-glow-fire">
                {txt('Tu mejor versión', 'Your best version')}
                <br />
                <span className="text-gradient-fire">{txt('te está esperando', 'is waiting')}</span>
              </h2>
            </FadeInView>

            <FadeInView delay={0.2}>
              <p className="text-body-lg text-text-secondary/90 max-w-xl mx-auto mb-10 font-semibold tracking-wide">
                {txt('Únete a miles de coaches y atletas que ya hicieron el cambio. Sin tarjeta.', 'Join thousands of coaches and athletes who already made the switch. No credit card required.')}
              </p>
            </FadeInView>

            <FadeInView delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.a
                  href="/sign-up"
                  className="inline-flex items-center gap-3 px-12 py-5 rounded-sm bg-brand-primary text-text-inverse font-black text-body uppercase tracking-[0.15em] animate-glow-pulse fire-border-glow"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {txt('EMPIEZA AHORA', 'START NOW')}
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
              </div>
            </FadeInView>

            <FadeInView delay={0.4}>
              <p className="text-body-sm text-text-tertiary/70 mt-6 uppercase tracking-wider">
                {txt('Prueba 14 días · Cancela cuando quieras · Sin tarjeta en Starter', 'Free 14-day trial · Cancel anytime · No card for Starter')}
              </p>
            </FadeInView>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/final-cta.tsx
git commit -m "feat(landing): rewrite final CTA with hero image and dense fire particles"
```

---

### Task 11: Build verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: All 44 pages build successfully, 0 errors.

- [ ] **Step 2: If build fails, fix errors and rebuild**

```bash
npm run build
```

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "fix(landing): build fixes after dark gritty redesign"
```
