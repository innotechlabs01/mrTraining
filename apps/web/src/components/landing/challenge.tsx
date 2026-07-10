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
