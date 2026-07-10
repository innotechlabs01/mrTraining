'use client';

import { FadeInView, SectionReveal } from './animation-primitives';
import { useLang } from './i18n';

const sports = [
  { id: 'gym', label: 'Gym', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' },
  { id: 'running', label: 'Running', img: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80' },
  { id: 'crossfit', label: 'CrossFit', img: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=600&q=80' },
  { id: 'tennis', label: 'Tenis', img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80' },
  { id: 'swimming', label: 'Natación', img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80' },
  { id: 'cycling', label: 'Ciclismo', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80' },
];

const athletes = [
  { id: 'athlete1', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80' },
  { id: 'athlete2', img: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80' },
  { id: 'athlete3', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80' },
];

export function AthleteJourneySection() {
  const { txt } = useLang();
  const athleteLabels = [txt('Atleta', 'Athlete'), txt('Coach', 'Coach'), txt('Comunidad', 'Community')];

  return (
    <section id="deportes" className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <FadeInView>
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-4">
              {txt('Donde sea que te retes', 'Wherever you get challenged')}
            </h2>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="text-body-lg text-text-secondary text-center max-w-2xl mx-auto mb-12">
              {txt('Un solo lugar para todo lo que te hace mejor. Elige tu campo de batalla.', 'One place for everything that makes you better. Pick your battlefield.')}
            </p>
          </FadeInView>
        </SectionReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sports.map((s, i) => (
            <FadeInView key={s.id} delay={i * 0.06}>
              <div className="relative group overflow-hidden rounded-lg aspect-[4/5] border border-surface-6">
                <img src={s.img} alt={s.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/30 to-brand-primary/10" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="font-display font-bold text-xl uppercase text-text-primary">{s.label}</span>
                </div>
              </div>
            </FadeInView>
          ))}
        </div>

        <FadeInView delay={0.1}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {athleteLabels.map((label, i) => (
              <div key={athletes[i].id} className="relative group overflow-hidden rounded-lg w-28 h-28 border border-surface-6">
                <img src={athletes[i].img} alt={label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <span className="text-xs font-semibold uppercase text-text-primary">{label}</span>
                </div>
              </div>
            ))}
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-ember/10 border border-brand-ember/30 text-ember-text font-semibold text-sm uppercase">
              🔥 {txt('+ Eventos y competencias', '+ Events & competitions')}
            </span>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
