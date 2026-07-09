'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { Puzzle, EyeOff, Clock, DollarSign, Unplug, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const painPoints = [
  {
    icon: Puzzle,
    title: 'Fragmented Tools',
    description: '5+ apps to run one coaching business. Nothing talks to each other.',
  },
  {
    icon: EyeOff,
    title: 'Data Blind Spots',
    description: 'No single view of athlete training, nutrition, and recovery.',
  },
  {
    icon: Clock,
    title: 'Manual Admin',
    description: 'Invoicing, scheduling, and communication — all done by hand.',
  },
  {
    icon: DollarSign,
    title: 'Lost Revenue',
    description: 'Chasing payments manually. No billing infrastructure built in.',
  },
  {
    icon: Unplug,
    title: 'No Ecosystem',
    description: 'Nutritionists, PTs, and coaches cannot collaborate on shared athletes.',
  },
  {
    icon: Lock,
    title: 'Siloed Data',
    description: 'Athlete data locked in separate, disconnected platforms.',
  },
];

function ProblemCard({
  icon: Icon,
  title,
  description,
  index,
}: (typeof painPoints)[number] & { index: number }) {
  return (
    <motion.div
      className={cn(
        'group relative p-6 rounded-lg bg-surface-2 border border-surface-6',
        'hover:bg-surface-3 hover:border-brand-primary/20 hover:-translate-y-1',
        'transition-all duration-300'
      )}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { delay: index * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
        },
      }}
    >
      <motion.div
        className="w-10 h-10 rounded-sm bg-brand-primary/10 flex items-center justify-center mb-4"
        variants={{
          hidden: { scale: 0 },
          visible: { scale: 1, transition: { delay: index * 0.1 + 0.15, type: 'spring' } },
        }}
      >
        <Icon className="w-5 h-5 text-brand-primary" />
      </motion.div>
      <h3 className="font-display font-semibold text-h4 text-text-primary mb-2">{title}</h3>
      <p className="text-body-sm text-text-secondary">{description}</p>
    </motion.div>
  );
}

export function ProblemSection() {
  return (
    <section className="relative py-24 lg:py-32 bg-surface-1">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                The tools you use are holding you back.
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-2xl mx-auto">
                Every coach faces the same problems. We solved them all — in one platform.
              </p>
            </FadeInView>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {painPoints.map((point, i) => (
              <ProblemCard key={point.title} {...point} index={i} />
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
