'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { useLang } from './i18n';

const testimonials = [
  {
    name: 'Sarah Chen',
    roleEs: 'Coach Jefa, Peak Performance',
    roleEn: 'Head Coach, Peak Performance',
    avatar: 'SC',
    quoteEs: 'MR Training reemplazó 5 herramientas. La retención subió de 72% a 94% en 3 meses. La IA me ahorra 10 horas semanales.',
    quoteEn: 'MR Training replaced 5 tools we were using. Retention went from 72% to 94% in 3 months. The AI saves me 10 hours a week.',
    metric: { labelEs: '94% retención', labelEn: '94% retention', color: 'text-success', value: 94 },
  },
  {
    name: 'Marcus Rivera',
    roleEs: 'Triatleta Olímpico',
    roleEn: 'Olympic Triathlete',
    avatar: 'MR',
    quoteEs: 'Mi coach y yo por fin estamos en la misma página. Mi 10K bajó de 14:20 a 12:30 esta temporada.',
    quoteEn: 'My coach and I are finally on the same page. My 10K dropped from 14:20 to 12:30 this season.',
    metric: { labelEs: '12:30 10K PR', labelEn: '12:30 10K PR', color: 'text-brand-primary', value: 12 },
  },
  {
    name: 'James Park',
    roleEs: 'Director, Elite Tennis',
    roleEn: 'Academy Director, Elite Tennis',
    avatar: 'JP',
    quoteEs: 'De hojas de cálculo a un sistema real. 300 atletas, 12 coaches, cero caos.',
    quoteEn: 'We went from spreadsheets to a real operating system. 300 athletes, 12 coaches, zero chaos.',
    metric: { labelEs: '300 atletas', labelEn: '300 athletes', color: 'text-brand-secondary', value: 300 },
  },
  {
    name: 'Lisa Thompson',
    roleEs: 'Nutricionista Deportiva',
    roleEn: 'Sports Nutritionist',
    avatar: 'LT',
    quoteEs: 'Veo la carga de entreno junto a la comida. Planes que apoyan el entreno, no lo pelean.',
    quoteEn: 'I can see training load alongside food logs. Nutrition that supports training, not fights it.',
    metric: { labelEs: '85+ clientes', labelEn: '85+ clients', color: 'text-violet-accent', value: 85 },
  },
  {
    name: 'David Kim',
    roleEs: 'Coach de Running',
    roleEn: 'Running Coach, Track Club',
    avatar: 'DK',
    quoteEs: 'La detección de anomalías evitó dos lesiones antes de que pasaran. Mis atletas confían más.',
    quoteEn: 'The anomaly detection caught two overtraining cases before injuries happened. Athletes trust me more.',
    metric: { labelEs: '2 lesiones evitadas', labelEn: '2 injuries prevented', color: 'text-warning', value: 2 },
  },
];

export function TestimonialsSection() {
  const { txt } = useLang();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const next = () => setCurrentIndex(prev => (prev + 1) % testimonials.length);
  const prev = () => setCurrentIndex(prev => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4">
                {txt('Coaches que exigen resultados.', 'Coaches who demand results.')}
              </h2>
            </FadeInView>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="p-8 md:p-12 rounded-xl bg-surface-3 border border-brand-primary/20 fire-glow"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-fire flex items-center justify-center text-h4 font-black text-surface-0">
                      {testimonials[currentIndex].avatar}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-body text-text-primary">
                        {testimonials[currentIndex].name}
                      </p>
                      <p className="text-body-sm text-text-tertiary">
                        {txt(testimonials[currentIndex].roleEs, testimonials[currentIndex].roleEn)}
                      </p>
                    </div>
                  </div>
                  <p className="text-body-lg text-text-secondary mb-6 leading-relaxed">
                    “{txt(testimonials[currentIndex].quoteEs, testimonials[currentIndex].quoteEn)}”
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`font-display font-black text-h3 ${testimonials[currentIndex].metric.color}`}>
                      {txt(testimonials[currentIndex].metric.labelEs, testimonials[currentIndex].metric.labelEn)}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, i) => (
                  <motion.button
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-brand-primary' : 'bg-surface-5 hover:bg-surface-4'}`}
                    onClick={() => setCurrentIndex(i)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
