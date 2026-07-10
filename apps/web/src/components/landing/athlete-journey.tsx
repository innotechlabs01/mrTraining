'use client';

import { motion } from 'framer-motion';
import { FadeInView, SectionReveal } from './animation-primitives';
import { useLang } from './i18n';

const sports = [
  { id: 'gym', label: 'Gym', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85', span: 'md:col-span-2 md:row-span-2' },
  { id: 'running', label: 'Running', img: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=85', span: '' },
  { id: 'crossfit', label: 'CrossFit', img: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=85', span: '' },
  { id: 'tennis', label: 'Tenis', img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=85', span: '' },
  { id: 'swimming', label: 'Natación', img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=85', span: '' },
  { id: 'cycling', label: 'Ciclismo', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=85', span: '' },
];

const athleteImages = [
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=85',
  'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=85',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=85',
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
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-4 tracking-wide">
              {txt('Donde sea que te retes', 'Wherever you get challenged')}
            </h2>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="text-body-lg text-text-secondary text-center max-w-2xl mx-auto mb-12">
              {txt('Un solo lugar para todo lo que te hace mejor. Elige tu campo de batalla.', 'One place for everything that makes you better. Pick your battlefield.')}
            </p>
          </FadeInView>
        </SectionReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[200px] md:auto-rows-[240px]">
          {sports.map((s, i) => (
            <FadeInView key={s.id} delay={i * 0.06}>
              <motion.div
                className={`relative group overflow-hidden rounded-lg border border-surface-6 ${s.span || 'col-span-1 row-span-1'}`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img src={s.img} alt={s.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-brand-primary/10" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="font-display font-black text-2xl uppercase text-text-primary tracking-wider drop-shadow-lg">{s.label}</span>
                </div>
              </motion.div>
            </FadeInView>
          ))}
        </div>

        <FadeInView delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {athleteImages.map((img, i) => (
              <motion.div
                key={i}
                className="relative group overflow-hidden rounded-full w-24 h-24 md:w-32 md:h-32 border-2 border-surface-6"
                whileHover={{ scale: 1.08, borderColor: '#FF6B00' }}
                transition={{ duration: 0.2 }}
              >
                <img src={img} alt={athleteLabels[i]} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-0/60 to-transparent rounded-full" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold uppercase text-text-primary tracking-wider drop-shadow-lg">{athleteLabels[i]}</span>
                </div>
              </motion.div>
            ))}
            <motion.span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand-ember/15 border border-brand-ember/40 text-ember-text font-bold text-sm uppercase tracking-wider"
              animate={{ boxShadow: ['0 0 0px rgba(255,179,0,0.2)', '0 0 16px rgba(255,179,0,0.4)', '0 0 0px rgba(255,179,0,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🔥 {txt('+ Eventos y competencias', '+ Events & competitions')}
            </motion.span>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
