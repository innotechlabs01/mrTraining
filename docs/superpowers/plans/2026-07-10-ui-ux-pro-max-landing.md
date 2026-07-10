# UI/UX Pro Max Landing Page Implementation Plan

**Goal:** Build a standalone landing page for the UI/UX Pro Max product at `/ui-ux-pro-max` within the existing Next.js `apps/web` app.

**Architecture:** Landing page sits at its own route `/ui-ux-pro-max` with a dedicated layout that overrides CSS variables for the light/clean theme. Seven section components (Hero, Features, HowItWorks, Integrations, Pricing, CTA, Footer) compose the page. No auth needed — route must be added to Clerk public routes.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, framer-motion, lucide-react

---

### Task 1: Add route to public routes + extend Tailwind config with clean theme colors

**Files:**
- Modify: `src/middleware.ts:4`
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add `/ui-ux-pro-max` to public routes**

`src/middleware.ts:4` — add `'/ui-ux-pro-max(.*)'` to `isPublicRoute` array.

- [ ] **Step 2: Add clean theme colors to Tailwind config**

In `tailwind.config.ts`, add `uiux` color palette under `theme.extend.colors`:

```js
uiux: {
  primary: '#6366F1',
  'primary-hover': '#4F46E5',
  'primary-light': '#EEF2FF',
  secondary: '#0EA5E9',
  'secondary-light': '#F0F9FF',
  surface: {
    0: '#FFFFFF',
    1: '#F8FAFC',
    2: '#F1F5F9',
    3: '#E2E8F0',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
  },
},
```

- [ ] **Step 3: Add light theme utility classes to globals.css**

Add before `@layer utilities` or in `@layer components`:

```css
.theme-uiux {
  --uiux-bg: #FFFFFF;
  --uiux-bg-alt: #F8FAFC;
  --uiux-text: #0F172A;
  --uiux-text-secondary: #475569;
}

.theme-uiux .glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
```

(These are used sparingly — most styling is via Tailwind's extended colors.)

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts tailwind.config.ts src/app/globals.css
git commit -m "feat: add ui-ux-pro-max public route and clean theme tokens"
```

---

### Task 2: Create UI/UX Pro Max layout

**Files:**
- Create: `src/app/ui-ux-pro-max/layout.tsx`

- [ ] **Step 1: Create layout**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UI/UX Pro Max — Design Inspection Tool',
  description:
    'Inspect designs. Review with context. Ship faster. UI/UX Pro Max unifies visual review, code inspection, and versioning in one place.',
  openGraph: {
    title: 'UI/UX Pro Max — Design Inspection Tool',
    description:
      'Inspect designs. Review with context. Ship faster.',
    type: 'website',
  },
};

export default function UiUxProMaxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="theme-uiux">{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/ui-ux-pro-max/layout.tsx
git commit -m "feat: add ui-ux-pro-max layout with light theme wrapper"
```

---

### Task 3: Create Hero section component

**Files:**
- Create: `src/components/ui-ux-pro-max/hero.tsx`

- [ ] **Step 1: Create hero component**

```tsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
      {/* Background gradient decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-50/80 via-sky-50/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-50/60 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-sm font-medium text-indigo-600 mb-6">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Design inspection reimagined
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight mb-6"
            >
              Inspect designs.{' '}
              <span className="text-indigo-600">Review with context.</span>{' '}
              Ship faster.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8"
            >
              UI/UX Pro Max unifies visual review, code inspection, and versioning in one place. No more context switching between tools.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                See how it works
              </a>
            </motion.div>
          </div>

          {/* Right: mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-xl shadow-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold">UX</span>
                  </div>
                  <p className="text-sm text-slate-400">Product preview</p>
                </div>
              </div>
            </div>
            {/* Decorative badge */}
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-lg text-sm font-medium text-slate-700">
              ✦ Inspect mode active
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui-ux-pro-max/hero.tsx
git commit -m "feat: add ui-ux-pro-max hero section"
```

---

### Task 4: Create Features section component

**Files:**
- Create: `src/components/ui-ux-pro-max/features.tsx`

- [ ] **Step 1: Create features component**

```tsx
'use client';

import { motion } from 'framer-motion';
import { Eye, Code2, GitBranch } from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Visual Review',
    description: 'Comment directly on designs. Pinpoint precision, threaded discussions, one-click approval.',
  },
  {
    icon: Code2,
    title: 'Code Inspector',
    description: 'Inspect CSS, measurements, typography, assets. Copy code with one click. Works with Figma/Sketch.',
  },
  {
    icon: GitBranch,
    title: 'Version History',
    description: 'Every change is saved. Compare versions, restore previous ones, full audit trail.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Everything you need to review designs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            Stop juggling tools. One platform for review, inspection, and version control.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui-ux-pro-max/features.tsx
git commit -m "feat: add ui-ux-pro-max features section"
```

---

### Task 5: Create How It Works section component

**Files:**
- Create: `src/components/ui-ux-pro-max/how-it-works.tsx`

- [ ] **Step 1: Create how-it-works component**

```tsx
'use client';

import { motion } from 'framer-motion';
import { Upload, Search, Share2 } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: 1,
    title: 'Upload',
    description: 'Upload your design from Figma, Sketch, or direct file import.',
  },
  {
    icon: Search,
    number: 2,
    title: 'Inspect & Review',
    description: 'Inspect CSS, measurements, assets. Leave precise comments.',
  },
  {
    icon: Share2,
    number: 3,
    title: 'Share & Approve',
    description: 'Share with your team. Approve or request changes. Every version is tracked.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            How it works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            Three simple steps from design to approval.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-14 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-[2px] bg-slate-200" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-6 relative z-10 shadow-sm">
                {step.number}
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui-ux-pro-max/how-it-works.tsx
git commit -m "feat: add ui-ux-pro-max how-it-works section"
```

---

### Task 6: Create Integrations section component

**Files:**
- Create: `src/components/ui-ux-pro-max/integrations.tsx`

- [ ] **Step 1: Create integrations component**

```tsx
'use client';

import { motion } from 'framer-motion';

const tools = [
  { name: 'Figma', icon: 'F' },
  { name: 'Sketch', icon: 'S' },
  { name: 'XD', icon: 'Xd' },
  { name: 'Zeplin', icon: 'Z' },
];

export function IntegrationsSection() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-2xl font-bold text-slate-900 mb-12"
        >
          Works with your favorite tools
        </motion.h2>

        <div className="flex flex-wrap items-center justify-center gap-12">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-400">
                {tool.icon}
              </span>
              <span className="text-lg font-semibold">{tool.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui-ux-pro-max/integrations.tsx
git commit -m "feat: add ui-ux-pro-max integrations section"
```

---

### Task 7: Create Pricing section component

**Files:**
- Create: `src/components/ui-ux-pro-max/pricing.tsx`

- [ ] **Step 1: Create pricing component**

```tsx
'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Perfect for getting started',
    features: ['1 project', '3 reviewers', '7-day version history'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For professional teams',
    features: ['Unlimited projects', '15 reviewers', 'Full version history', 'CSS export', 'Priority support'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['SSO / SAML', 'Audit logs', 'On-premise option', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            No hidden fees. No surprises.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-8 ${
                plan.highlighted
                  ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-500/10'
                  : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                {plan.period && <span className="text-slate-400 text-sm ml-1">{plan.period}</span>}
              </div>
              <p className="text-sm text-slate-500 mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`block text-center py-2.5 rounded-lg font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui-ux-pro-max/pricing.tsx
git commit -m "feat: add ui-ux-pro-max pricing section"
```

---

### Task 8: Create CTA + Footer section components

**Files:**
- Create: `src/components/ui-ux-pro-max/cta.tsx`
- Create: `src/components/ui-ux-pro-max/footer.tsx`

- [ ] **Step 1: Create CTA component**

```tsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-br from-indigo-600 to-indigo-700">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-4"
        >
          Ready to ship better designs?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-indigo-100 max-w-xl mx-auto mb-8"
        >
          Join thousands of designers and developers who review with confidence.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create Footer component**

```tsx
'use client';

const footerColumns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Blog', 'Community'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Contact', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  },
];

export function FooterSection() {
  return (
    <footer className="py-16 bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              UX
            </div>
            <span className="text-sm font-semibold text-slate-700">UI/UX Pro Max</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} UI/UX Pro Max. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui-ux-pro-max/cta.tsx src/components/ui-ux-pro-max/footer.tsx
git commit -m "feat: add ui-ux-pro-max cta and footer sections"
```

---

### Task 9: Compose page + create UI/UX Pro Max directory index

**Files:**
- Create: `src/app/ui-ux-pro-max/page.tsx`

- [ ] **Step 1: Create page.tsx**

```tsx
import { HeroSection } from '@/components/ui-ux-pro-max/hero';
import { FeaturesSection } from '@/components/ui-ux-pro-max/features';
import { HowItWorksSection } from '@/components/ui-ux-pro-max/how-it-works';
import { IntegrationsSection } from '@/components/ui-ux-pro-max/integrations';
import { PricingSection } from '@/components/ui-ux-pro-max/pricing';
import { CtaSection } from '@/components/ui-ux-pro-max/cta';
import { FooterSection } from '@/components/ui-ux-pro-max/footer';

export default function UiUxProMaxPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <IntegrationsSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Create components barrel export (optional, for clean imports)**

Create `src/components/ui-ux-pro-max/index.ts`:

```ts
export { HeroSection } from './hero';
export { FeaturesSection } from './features';
export { HowItWorksSection } from './how-it-works';
export { IntegrationsSection } from './integrations';
export { PricingSection } from './pricing';
export { CtaSection } from './cta';
export { FooterSection } from './footer';
```

- [ ] **Step 3: Commit**

```bash
git add src/app/ui-ux-pro-max/page.tsx src/components/ui-ux-pro-max/index.ts
git commit -m "feat: compose ui-ux-pro-max landing page"
```

---

### Task 10: Verify build

- [ ] **Step 1: Run build to verify**

Run: `cd apps/web && npx next build`
Expected: Successful build with no TypeScript errors, new route `/ui-ux-pro-max` listed.

- [ ] **Step 2: Fix any TypeScript errors if present**

- [ ] **Step 3: Run lint**

Run: `cd apps/web && npx next lint`
Expected: No warnings or errors.
