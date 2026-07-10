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
          alt={txt('Atleta entrenando con intensidad', 'Athlete training with intensity')}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-0/90 via-surface-0/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-0/60 via-transparent to-surface-0/80" />
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

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <ChevronDown className="text-brand-primary/60 w-6 h-6" />
      </motion.div>
    </section>
  );
}
