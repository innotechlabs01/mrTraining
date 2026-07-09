'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { Logo } from './logo';
import {
  Dumbbell, Apple, Heart, Users, Trophy,
  CreditCard, Brain, BarChart3, Users2, MessageCircle,
} from 'lucide-react';

const modules = [
  { id: 'training', icon: Dumbbell, label: 'Training', orbit: 0, angle: 0, color: 'text-brand-primary' },
  { id: 'nutrition', icon: Apple, label: 'Nutrition', orbit: 0, angle: 36, color: 'text-success' },
  { id: 'recovery', icon: Heart, label: 'Recovery', orbit: 0, angle: 72, color: 'text-violet-accent' },
  { id: 'community', icon: Users, label: 'Community', orbit: 0, angle: 108, color: 'text-brand-secondary' },
  { id: 'events', icon: Trophy, label: 'Events', orbit: 0, angle: 144, color: 'text-coral-accent' },
  { id: 'payments', icon: CreditCard, label: 'Payments', orbit: 0, angle: 180, color: 'text-success' },
  { id: 'ai', icon: Brain, label: 'AI', orbit: 0, angle: 216, color: 'text-brand-secondary' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', orbit: 0, angle: 252, color: 'text-teal-accent' },
  { id: 'crm', icon: Users2, label: 'CRM', orbit: 0, angle: 288, color: 'text-warning' },
  { id: 'communications', icon: MessageCircle, label: 'Comms', orbit: 0, angle: 324, color: 'text-brand-primary' },
];

const moduleDetails: Record<string, { title: string; description: string; features: string[] }> = {
  training: {
    title: 'Multi-Sport Training',
    description: 'Drag-and-drop periodization for every sport. Build once, reuse forever.',
    features: ['Program builder with AI assistance', 'Template library with auto-progression', 'Gym, Running, Tennis, Swimming, Cycling, CrossFit'],
  },
  nutrition: {
    title: 'Nutrition Planning',
    description: 'Meal plans that adapt to training load, dietary needs, and goals.',
    features: ['Macro & micronutrient tracking', 'Barcode scanner & food database', 'Hydration monitoring'],
  },
  recovery: {
    title: 'Recovery Management',
    description: 'Sleep, HRV, readiness — all in one place. Prevent overtraining before it happens.',
    features: ['Wearable integration (Whoop, Garmin, Oura)', 'Readiness scoring', 'Injury management & rehab protocols'],
  },
  community: {
    title: 'Community & Social',
    description: 'Training is better together. Build the culture that keeps athletes coming back.',
    features: ['Activity feed & challenges', 'Leaderboards & achievements', 'Groups by sport, team, or goal'],
  },
  events: {
    title: 'Events & Competitions',
    description: 'Tournaments, camps, meetups — registration, waivers, and results built in.',
    features: ['Online registration & waivers', 'Payment collection', 'Results & leaderboards'],
  },
  payments: {
    title: 'Payments & Billing',
    description: 'Automated subscriptions, invoicing, and payouts. Get paid without thinking about it.',
    features: ['Subscription management', 'Automated invoicing', 'Multi-currency support'],
  },
  ai: {
    title: 'AI Engine',
    description: 'Your AI teammate — generates, analyzes, predicts. Always with you in control.',
    features: ['Workout & nutrition generation', 'Performance insights', 'Anomaly detection & alerts'],
  },
  analytics: {
    title: 'Analytics & Reports',
    description: 'Turn data into decisions. Dashboards that show what matters.',
    features: ['Athlete & coach dashboards', 'Custom reports', 'Comparative benchmarks'],
  },
  crm: {
    title: 'Athlete CRM',
    description: 'Manage your entire roster. Know who needs attention today.',
    features: ['Athlete lifecycle tracking', 'Automated check-ins', 'Goal setting & review'],
  },
  communications: {
    title: 'Communications',
    description: 'Messaging, broadcasts, and notifications — all in context.',
    features: ['In-app messaging', 'Push notifications & email', 'Broadcast announcements'],
  },
};

export function FeaturesSection() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const orbitRadius = 160;

  return (
    <section id="features" className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Everything your athletes need.{' '}
                <span className="text-text-secondary">Nothing they don&apos;t.</span>
              </h2>
            </FadeInView>
          </div>
        </SectionReveal>

        {/* Orbit Map — Desktop */}
        <div className="hidden lg:block">
          <div className="relative w-full max-w-[500px] h-[500px] mx-auto">
            {/* Orbit rings */}
            {[140, 190, 240].map((r, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-6/50"
                style={{ width: r * 2, height: r * 2 }}
              />
            ))}

            {/* Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-20 h-20 rounded-full bg-surface-3 border border-brand-primary/30 flex items-center justify-center shadow-lg shadow-brand-primary/10">
                  <Logo monogramOnly size="lg" />
                </div>
              </motion.div>
            </div>

            {/* Module nodes */}
            {modules.map((mod, i) => {
              const angle = (i / modules.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * orbitRadius;
              const y = Math.sin(angle) * orbitRadius;

              return (
                <motion.button
                  key={mod.id}
                  className="absolute z-20 flex flex-col items-center gap-1 group"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: i * 0.05, type: 'spring' },
                  }}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
                  viewport={{ once: true }}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                      activeModule === mod.id
                        ? 'bg-brand-primary/20 border border-brand-primary'
                        : 'bg-surface-3 border border-surface-6 group-hover:border-brand-primary/30'
                    }`}
                  >
                    <mod.icon className={`w-5 h-5 ${mod.color}`} />
                  </div>
                  <span className="text-caption text-text-tertiary group-hover:text-text-secondary transition-colors whitespace-nowrap">
                    {mod.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Detail card */}
          <AnimatePresence>
            {activeModule && moduleDetails[activeModule] && (
              <motion.div
                className="max-w-lg mx-auto mt-8 p-6 rounded-lg bg-surface-3 border border-brand-primary/20"
                initial={{ opacity: 0, y: 16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="font-display font-semibold text-h4 text-text-primary mb-2">
                  {moduleDetails[activeModule].title}
                </h4>
                <p className="text-body-sm text-text-secondary mb-4">
                  {moduleDetails[activeModule].description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {moduleDetails[activeModule].features.map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1 text-caption rounded-full bg-surface-4 border border-surface-6 text-text-secondary"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile: Card grid */}
        <div className="lg:hidden grid grid-cols-2 gap-3">
          {modules.slice(0, 8).map((mod, i) => (
            <motion.button
              key={mod.id}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                activeModule === mod.id
                  ? 'bg-surface-3 border-brand-primary/30'
                  : 'bg-surface-2 border-surface-6'
              }`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
            >
              <mod.icon className={`w-6 h-6 ${mod.color}`} />
              <span className="text-caption text-text-secondary">{mod.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
