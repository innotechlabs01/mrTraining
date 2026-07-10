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
                alt={txt('Atleta en momentos de esfuerzo intenso', 'Athlete in moments of intense effort')}
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
