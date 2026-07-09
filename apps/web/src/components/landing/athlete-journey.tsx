'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { Sunrise, Utensils, Dumbbell, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const athleteSteps = [
  {
    time: '7:00 AM',
    label: 'WAKE',
    icon: Sunrise,
    title: 'Recovery Score: 82',
    description: 'Sleep: 7.5h. HRV trending up. Your body is ready for today.',
    color: 'text-violet-accent',
  },
  {
    time: '12:00 PM',
    label: 'FUEL',
    icon: Utensils,
    title: 'Nutrition Plan Ready',
    description: 'Macros calculated for today\'s training load. Meals pre-logged and waiting.',
    color: 'text-success',
  },
  {
    time: '6:00 PM',
    label: 'TRAIN',
    icon: Dumbbell,
    title: 'Today\'s Workout',
    description: 'Log sets in real time. Get coach feedback before your rest timer ends.',
    color: 'text-brand-primary',
  },
  {
    time: '9:00 PM',
    label: 'RECOVER',
    icon: Moon,
    title: 'Sleep & Recovery',
    description: 'Mobility routine. Sleep tracking. Readiness score for tomorrow.',
    color: 'text-brand-secondary',
  },
];

export function AthleteJourneySection() {
  return (
    <section className="relative py-24 lg:py-32 bg-surface-0 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-4">
                For Athletes
              </p>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Your day, amplified.
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                From wake-up to lights out, MR Training is with you — not distracting you,
                guiding you.
              </p>
            </FadeInView>
          </div>

          {/* Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-[72px] left-[10%] right-[10%] h-0.5 bg-surface-6" />

            <div className="grid lg:grid-cols-4 gap-8">
              {athleteSteps.map((step, i) => (
                <FadeInView key={step.label} delay={i * 0.15}>
                  <div className="relative flex flex-col items-center text-center">
                    {/* Node */}
                    <div className="relative z-10 mb-6">
                      <motion.div
                        className={cn(
                          'w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all',
                          'bg-surface-1 border-surface-6'
                        )}
                        whileHover={{ scale: 1.1 }}
                      >
                        <step.icon className={cn('w-6 h-6', step.color)} />
                      </motion.div>
                      {i < athleteSteps.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 left-full w-[calc(100%+2rem)] h-0.5 bg-brand-primary/30 -z-10" />
                      )}
                    </div>

                    {/* Time badge */}
                    <span className="font-display text-overline text-text-tertiary mb-2">
                      {step.time}
                    </span>
                    <span className={cn('font-display font-bold text-h4 mb-3', step.color)}>
                      {step.label}
                    </span>
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      <span className="block font-semibold text-text-primary mb-1">
                        {step.title}
                      </span>
                      {step.description}
                    </p>
                  </div>
                </FadeInView>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

const coachSteps = [
  {
    label: 'DESIGN',
    icon: Dumbbell,
    title: 'Build Programs',
    description: 'AI-assisted program builder with templates. Periodization built in.',
    color: 'text-brand-primary',
  },
  {
    label: 'ASSIGN',
    icon: Utensils,
    title: 'Push to Athletes',
    description: 'Assign programs in 1 click. Auto-syncs to every device. No manual setup.',
    color: 'text-success',
  },
  {
    label: 'MONITOR',
    icon: Sunrise,
    title: 'Real-Time Adherence',
    description: 'See who\'s training. Get alerts when athletes need attention.',
    color: 'text-warning',
  },
  {
    label: 'GROW',
    icon: Moon,
    title: 'Scale Your Business',
    description: 'Analytics, revenue tracking, and retention insights. Built for growth.',
    color: 'text-brand-secondary',
  },
];

export function CoachJourneySection() {
  return (
    <section className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-4">
                For Coaches
              </p>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Your coaching business, running itself.
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                Spend your time coaching, not administering. The platform handles the rest.
              </p>
            </FadeInView>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden lg:block absolute top-[72px] left-[10%] right-[10%] h-0.5 bg-surface-6" />
            <div className="grid lg:grid-cols-4 gap-8">
              {coachSteps.map((step, i) => (
                <FadeInView key={step.label} delay={i * 0.15}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative z-10 mb-6">
                      <motion.div
                        className={cn(
                          'w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all',
                          'bg-surface-2 border-surface-6'
                        )}
                        whileHover={{ scale: 1.1 }}
                      >
                        <step.icon className={cn('w-6 h-6', step.color)} />
                      </motion.div>
                    </div>
                    <span className={cn('font-display font-bold text-h4 mb-3', step.color)}>
                      {step.label}
                    </span>
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      <span className="block font-semibold text-text-primary mb-1">
                        {step.title}
                      </span>
                      {step.description}
                    </p>
                  </div>
                </FadeInView>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
