'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FadeInView } from './animation-primitives';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-surface-0">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[128px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* Gradient overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-0" />

      {/* Content */}
      <div className="relative z-10 section-container text-center">
        <FadeInView delay={0.2}>
          <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-6">
            The Operating System for Sports Performance
          </p>
        </FadeInView>

        <FadeInView delay={0.4}>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-text-primary max-w-4xl mx-auto leading-[1.05]">
            Every athlete. Every coach.{' '}
            <span className="text-gradient-orange">One platform.</span>
          </h1>
        </FadeInView>

        <FadeInView delay={0.6}>
          <p className="mt-6 text-body-lg text-text-secondary max-w-xl mx-auto">
            MR Training unifies training, nutrition, recovery, community, and coaching
            into a single platform built for how athletes and coaches actually work.
          </p>
        </FadeInView>

        <FadeInView delay={0.8}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="/sign-up"
              className="inline-flex items-center justify-center h-14 px-10 text-body font-semibold rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-pressed transition-colors animate-glow-pulse"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Free Trial
            </motion.a>
            <a
              href="#storytelling"
              className="inline-flex items-center gap-2 h-14 px-8 text-body font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              See How It Works
            </a>
          </div>
        </FadeInView>

        <FadeInView delay={1.0}>
          <p className="mt-12 text-caption text-text-tertiary flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8H11M8 5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Trusted by coaches across 47 countries
          </p>
        </FadeInView>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="text-brand-primary/60 w-6 h-6" />
      </motion.div>
    </section>
  );
}
