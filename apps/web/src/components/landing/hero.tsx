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
