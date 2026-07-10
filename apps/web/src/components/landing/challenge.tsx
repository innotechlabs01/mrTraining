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
          alt={txt('Grupo de atletas entrenando juntos', 'Group of athletes training together')}
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
