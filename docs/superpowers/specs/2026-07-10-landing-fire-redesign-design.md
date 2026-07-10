# Landing Redesign — "MR Training: Forja tu bestia"

**Date:** 2026-07-10
**Status:** Approved (design)
**Scope:** Full rebuild of the marketing landing page (`apps/web/src/app/(marketing)/page.tsx` and `apps/web/src/components/landing/*`)

---

## 1. Goal & Vibe

Replace the current corporate-SaaS landing with a **raw, fire-driven, emotional** experience about personal overcoming and "beast mode". Brand name stays **MR Training**; attitude/tagline is **"Forja tu bestia"** / **"Deja de empezar mañana"**.

- **Energy:** incandescent, motivational, gritty. Multi-sport (gym, running, crossfit, tennis, swimming, cycling, events) — not gym-only.
- **Promotions (multiple, combined):** 14-day free trial (no card), 50% founder discount, 30-day challenge, events.
- **Bilingual:** Spanish + English, toggle in nav.

---

## 2. Visual System

### Colors (extend existing tokens, no removal)
- Base: `surface-0` `#0A0B0D` (near-black charcoal).
- Fire primary: `brand-primary` `#FF6B00` (kept, intensified in usage).
- **New** `brand-ember: '#FFB300'` (yellow brasa) for energy peaks, gradients, and accent text.
- Fire gradient: `linear-gradient(135deg, #FF6B00, #FFB300)` for titles and CTAs.
- Keep secondary/success/error/warning tokens for functional UI.

### Typography
- Display: **Montserrat 900** (ultra-black) for hero/titles, up to `8xl`, UPPERCASE, tight `letter-spacing`.
- Body: Inter (unchanged).
- New classes in `globals.css`:
  - `.text-gradient-fire` → orange→ember gradient clip.
  - `.fire-glow` → pulsing orange box-shadow (reuse `animate-glow-pulse`).
  - `.grain` → subtle noise/grain overlay utility (radial + low-opacity).
  - `.ember-text` → ember/yellow color for emphasis words.

### Motion
- Reuse existing `glow-pulse`, `float`. Add `fire-flicker` keyframe (subtle opacity/scale flicker) and `marquee` (horizontal loop) for the promo bar.

---

## 3. Architecture

Single component tree, **no duplicated JSX** for languages.

- `LanguageContext` (`'es' | 'en'`) + `useLang()` hook in `features/i18n` (or `components/landing/i18n.tsx`).
- Each section receives `lang` via context and reads from a local `content` object `{ es, en }`.
- Nav gets an **ES / EN switch** (persist choice to `localStorage`).
- Keep existing section file structure under `components/landing/`; rewrite each file's content + styling.

### Files changed
- `tailwind.config.ts` — add `brand.ember`, animations `fire-flicker`, `marquee`, font weights if needed.
- `app/globals.css` — add `.text-gradient-fire`, `.fire-glow`, `.grain`, `.ember-text`.
- `components/landing/i18n.tsx` — context, hook, provider.
- `components/landing/nav.tsx` — add language switch + "Entrenar gratis" CTA.
- `components/landing/hero.tsx` — fire hero.
- `components/landing/promo-marquee.tsx` — **NEW** promo bar.
- `components/landing/athlete-journey.tsx` → repurpose as **Multideporte** (gym/running/crossfit/tennis/swimming/cycling + events).
- `components/landing/storytelling.tsx` — emotional manifesto.
- `components/landing/transformation.tsx` — before/after + progress testimonials.
- `components/landing/challenge.tsx` — **NEW** 30-day challenge block w/ urgency countdown + founder discount.
- `components/landing/features.tsx` — platform features (AI coach, training, nutrition, recovery, analytics).
- `components/landing/events.tsx` — races/competitions/community challenges.
- `components/landing/testimonials.tsx`, `pricing.tsx`, `faq.tsx`, `final-cta.tsx`, `footer.tsx` — restyle fire.
- `app/(marketing)/page.tsx` — reorder sections, wrap in `LanguageProvider`.

---

## 4. Sections (final order)

1. **Nav** — logo, links (Deportes/Prices/Retos/Eventos), ES/EN switch, "Entrenar gratis" CTA.
2. **Hero** — giant uppercase headline ("DEJA DE EMPEZAR MAÑANA" / "STOP STARTING TOMORROW"), emotional subhead, athlete-in-effort photo w/ fire overlay, dual CTA (14-day free / See the challenge), promo badge.
3. **Promo marquee** — looping fire bar: "14 DÍAS GRATIS · 50% OFF FUNDADOR · RETO 30 DÍAS · SIN TARJETA".
4. **Multideporte** — photo cards: Gym · Running · CrossFit · Tenis · Natación · Ciclismo · + Eventos. "Un solo lugar para todo lo que te reta."
5. **Manifiesto emocional** — full-screen manifesto on overcoming ("Nadie viene a salvarte. Te salvas tú.").
6. **Transformación** — before/after visual + progress testimonials.
7. **Reto 30 días** — urgency countdown, struck-through price, fire CTA.
8. **Features / AI Coach** — what the platform does, ember icons.
9. **Eventos** — races/competitions/community challenges with dates.
10. **Testimonios** — real faces + punchy quotes.
11. **Precios** — plans with "50% OFF Fundador" highlighted.
12. **FAQ** — short, direct.
13. **CTA final** — full-width fire screen: "TU MEJOR VERSIÓN TE ESTÁ ESPERANDO."
14. **Footer** — links + socials.

---

## 5. Imagery (mix stock + AI)

- **Stock (Unsplash):** real athletes — hero effort, multideporte cards, transformation, testimonials.
- **AI:** fire/ember background textures and stylized athlete art with consistent orange palette. Generated via image tool, optimized/placed as static assets in `public/`.
- All images get a fire-gradient overlay + slight grain for cohesion.

---

## 6. Copy

- Fully **bilingual** (ES default, EN toggle).
- Tone: motivational/emotional, short mantra-like lines. Rewritten from current corporate English.
- Promotional copy present in marquee, challenge block, pricing, and CTAs.

---

## 7. Responsiveness & Accessibility

- Mobile-first (current is mobile-aware); fire effects scale down gracefully.
- Respect `prefers-reduced-motion` (already global) — disable flicker/marquee for those users.
- Alt text on all images; semantic headings; sufficient contrast for body text on dark bg.

---

## 8. Out of scope

- No app/dashboard changes (athlete/coach layouts untouched).
- No backend/promo logic — prices/discounts are static marketing copy.
- No real auth flow changes.

---

## 9. Success criteria

- Build passes (`pnpm run build`).
- Landing renders fire theme + all 14 sections, ES/EN toggle works, responsive on mobile + desktop.
- Promotions visibly present (marquee, challenge, pricing).
- Multideporte represented (not gym-only).
