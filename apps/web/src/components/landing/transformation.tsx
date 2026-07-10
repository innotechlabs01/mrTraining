'use client';

import { FadeInView, SectionReveal } from './animation-primitives';
import { useLang } from './i18n';

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
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-12">
              {txt('De 0 a imparable', 'From zero to unstoppable')}
            </h2>
          </FadeInView>
        </SectionReveal>
        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <FadeInView key={c.label} delay={i * 0.1}>
              <div className="rounded-lg overflow-hidden border border-surface-6 bg-surface-3">
                <div className="aspect-[3/4] bg-gradient-to-br from-surface-3 to-surface-4 flex items-center justify-center">
                  <span className="font-display font-black text-5xl text-gradient-fire">+{c.pct}%</span>
                </div>
                <div className="p-4">
                  <p className="text-body-sm text-text-secondary text-center">
                    {txt('Progreso real, semana a semana.', 'Real progress, week by week.')}
                  </p>
                  <p className="text-center text-ember-text font-semibold mt-1">{c.label}</p>
                </div>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
