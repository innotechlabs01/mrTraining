'use client';

import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { FireParticles } from './fire-particles';

export function FinalCtaSection() {
  return (
    <section id="cta-final" className="relative py-24 lg:py-0 min-h-[60vh] lg:min-h-screen bg-surface-0 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=85"
          alt="Atleta entrenando con determinación"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/70 to-surface-0/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-0/60 via-transparent to-surface-0/40" />
      </div>
      <div className="grain" />
      <FireParticles count={120} speed={0.8} />

      <div className="section-container relative z-10 flex flex-col items-center justify-center min-h-[60vh] lg:min-h-screen text-center">
        <SectionReveal>
          <FadeInView>
            <motion.h2
              className="font-display font-black text-h1 lg:text-hero uppercase leading-[1.05] tracking-wide max-w-4xl mx-auto"
              animate={{ textShadow: ['0 0 20px rgba(255,107,0,0.3)', '0 0 40px rgba(255,107,0,0.5)', '0 0 20px rgba(255,107,0,0.3)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-text-primary">MR {''}</span>
              <span className="text-gradient-fire">Training</span>
            </motion.h2>
          </FadeInView>

          <FadeInView delay={0.15}>
            <p className="mt-6 text-body-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              La plataforma que coaches de alto rendimiento usan para transformar atletas.
              <br />
              Sin Spreadsheets. Sin caos. Sin excusas.
            </p>
          </FadeInView>

          <FadeInView delay={0.3}>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
              <motion.a
                href="/sign-up"
                className="inline-flex items-center justify-center h-14 px-10 text-body font-bold uppercase tracking-widest rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover transition-all fire-border-glow"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
              >
                Entrenar Gratis
              </motion.a>
              <motion.a
                href="#features"
                className="inline-flex items-center justify-center h-14 px-10 text-body font-bold uppercase tracking-widest rounded-sm border border-surface-6 text-text-primary hover:border-brand-primary/50 hover:bg-surface-3 transition-all"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Ver Funciones
              </motion.a>
            </div>
          </FadeInView>

          <FadeInView delay={0.4}>
            <p className="mt-8 text-body-sm text-text-tertiary flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Sin tarjeta de crédito. Sin compromiso. Sin trucos.
            </p>
          </FadeInView>
        </SectionReveal>
      </div>
    </section>
  );
}
