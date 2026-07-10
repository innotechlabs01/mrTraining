'use client';

import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { useLang } from './i18n';

const cardImages = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80',
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=500&q=80',
  'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=500&q=80',
];

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
            <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary text-center mb-12 tracking-wide">
              {txt('De 0 a imparable', 'From zero to unstoppable')}
            </h2>
          </FadeInView>
        </SectionReveal>
        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <FadeInView key={c.label} delay={i * 0.1}>
              <motion.div
                className="relative group rounded-lg overflow-hidden border border-surface-6"
                whileHover={{ y: -6, boxShadow: '0 0 30px rgba(255,107,0,0.3)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="aspect-[3/4] relative">
                  <img src={cardImages[i]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/60 to-surface-0/20" />
                  <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display font-black text-6xl lg:text-7xl text-gradient-fire drop-shadow-lg">+{c.pct}%</span>
                  </div>
                </div>
                <div className="p-4 bg-surface-3">
                  <p className="text-body-sm text-text-secondary text-center uppercase tracking-wider font-semibold">
                    {txt('Progreso real, semana a semana.', 'Real progress, week by week.')}
                  </p>
                  <p className="text-center font-display font-bold text-h4 text-gradient-fire mt-1">{c.label}</p>
                </div>
              </motion.div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
