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
    img: 'https://images.unsplash.com/photo-1517840901100-8179e98271b7?w=200&q=85',
    quoteEs: 'MR Training reemplazó 5 herramientas. La retención subió de 72% a 94% en 3 meses. La IA me ahorra 10 horas semanales.',
    quoteEn: 'MR Training replaced 5 tools. Retention went from 72% to 94% in 3 months. The AI saves me 10 hours a week.',
    metric: { labelEs: '94% retención', labelEn: '94% retention', color: 'text-success' },
  },
  {
    name: 'Marcus Rivera',
    roleEs: 'Triatleta Olímpico',
    roleEn: 'Olympic Triathlete',
    img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=85',
    quoteEs: 'Mi entrenador y yo por fin estamos en la misma página. Mi 10K bajó de 14:20 a 12:30 esta temporada.',
    quoteEn: 'My coach and I are finally on the same page. My 10K dropped from 14:20 to 12:30 this season.',
    metric: { labelEs: '12:30 10K PR', labelEn: '12:30 10K PR', color: 'text-brand-primary' },
  },
  {
    name: 'James Park',
    roleEs: 'Director, Elite Tennis',
    roleEn: 'Academy Director, Elite Tennis',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=85',
    quoteEs: 'De hojas de cálculo a un sistema real. 300 atletas, 12 coaches, cero caos.',
    quoteEn: 'From spreadsheets to a real system. 300 athletes, 12 coaches, zero chaos.',
    metric: { labelEs: '300 atletas', labelEn: '300 athletes', color: 'text-brand-secondary' },
  },
  {
    name: 'Lisa Thompson',
    roleEs: 'Nutricionista Deportiva',
    roleEn: 'Sports Nutritionist',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=85',
    quoteEs: 'Veo la carga de entreno junto a la comida. Planes que complementan el entreno.',
    quoteEn: 'I can see training load alongside food logs. Nutrition that supports training.',
    metric: { labelEs: '85+ clientes', labelEn: '85+ clients', color: 'text-violet-accent' },
  },
  {
    name: 'David Kim',
    roleEs: 'Coach de Running',
    roleEn: 'Running Coach, Track Club',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=85',
    quoteEs: 'La detección de anomalías evitó dos lesiones antes de que pasaran.',
    quoteEn: 'Anomaly detection caught two overtraining cases before injuries happened.',
    metric: { labelEs: '2 lesiones evitadas', labelEn: '2 injuries prevented', color: 'text-warning' },
  },
];

export function TestimonialsSection() {
  const { txt } = useLang();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4 tracking-wide">
                {txt('Coaches que exigen resultados.', 'Coaches who demand results.')}
              </h2>
            </FadeInView>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className="p-8 md:p-12 rounded-xl bg-surface-3 border border-brand-primary/30"
                  style={{ boxShadow: '0 0 30px rgba(255,107,0,0.15)' }}
                >
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-brand-primary/50">
                      <img src={testimonials[currentIndex].img} alt={testimonials[currentIndex].name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-body text-text-primary">{testimonials[currentIndex].name}</p>
                      <p className="text-body-sm text-text-tertiary">{txt(testimonials[currentIndex].roleEs, testimonials[currentIndex].roleEn)}</p>
                    </div>
                  </div>
                  <p className="text-body-lg text-text-secondary mb-6 leading-relaxed">
                    &ldquo;{txt(testimonials[currentIndex].quoteEs, testimonials[currentIndex].quoteEn)}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-h3 text-gradient-fire">
                      {txt(testimonials[currentIndex].metric.labelEs, testimonials[currentIndex].metric.labelEn)}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, i) => (
                  <motion.button
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-10 bg-brand-primary' : 'w-2 bg-surface-5 hover:bg-surface-4'}`}
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
