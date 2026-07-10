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
