'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView, CountUp } from './animation-primitives';
import { TrendingUp, Target, Star, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head Coach, Peak Performance',
    avatar: 'SC',
    quote: 'MR Training replaced 5 tools we were using. Our athlete retention went from 72% to 94% in 3 months. The AI saves me 10 hours a week on program design.',
    metric: { label: '▲ 94% retention', color: 'text-success', value: 94 },
  },
  {
    name: 'Marcus Rivera',
    role: 'Olympic Triathlete',
    avatar: 'MR',
    quote: 'My coach and I are finally on the same page. One platform, one source of truth. My 10K dropped from 14:20 to 12:30 this season.',
    metric: { label: '▼ 12:30 10K PR', color: 'text-brand-primary', value: 1230 },
  },
  {
    name: 'James Park',
    role: 'Academy Director, Elite Tennis',
    avatar: 'JP',
    quote: 'We went from spreadsheets to a real operating system. 300 athletes, 12 coaches, zero chaos. The event management alone saved us weeks of work.',
    metric: { label: '300 athletes managed', color: 'text-brand-secondary', value: 300 },
  },
  {
    name: 'Lisa Thompson',
    role: 'Sports Nutritionist',
    avatar: 'LT',
    quote: 'I can see training load alongside food logs. My meal plans are finally contextual — nutrition that actually supports the training, not fights it.',
    metric: { label: '85+ clients', color: 'text-violet-accent', value: 85 },
  },
  {
    name: 'David Kim',
    role: 'Running Coach, Track Club',
    avatar: 'DK',
    quote: 'The anomaly detection caught two overtraining cases before injuries happened. My athletes trust me more because the data backs my decisions.',
    metric: { label: '2 injuries prevented', color: 'text-warning', value: 2 },
  },
];

export function TestimonialsSection() {
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
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Trusted by coaches who demand results.
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
                  className="p-8 md:p-12 rounded-xl bg-surface-3 border border-surface-6"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-surface-4 flex items-center justify-center text-h4 font-bold text-text-secondary">
                      {testimonials[currentIndex].avatar}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-body text-text-primary">
                        {testimonials[currentIndex].name}
                      </p>
                      <p className="text-body-sm text-text-tertiary">
                        {testimonials[currentIndex].role}
                      </p>
                    </div>
                  </div>
                  <p className="text-body-lg text-text-secondary mb-6 leading-relaxed italic">
                    {testimonials[currentIndex].quote}
                  </p>
                  <div className="flex items-center gap-4">
                    <CountUp
                      end={testimonials[currentIndex].metric.value}
                      className={cn('font-display font-bold text-h3', testimonials[currentIndex].metric.color)}
                    />
                    <span className={cn('text-body text-text-secondary', testimonials[currentIndex].metric.color)}>
                      {testimonials[currentIndex].metric.label.replace(/▲|▼/g, '').trim()}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation dots */}
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, i) => (
                  <motion.button
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      i === currentIndex
                        ? 'w-8 bg-brand-primary'
                        : 'bg-surface-5 hover:bg-surface-4'
                    )}
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