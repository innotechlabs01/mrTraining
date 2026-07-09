'use client';

import { SectionReveal, FadeInView, CountUp } from './animation-primitives';
import { motion } from 'framer-motion';
import { Trophy, Flame, CalendarDays, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const feedCards = [
  {
    type: 'workout',
    name: 'Sarah M.',
    sport: 'Marathon Runner',
    content: '18 miles done. New longest run. Averaged 8:12/mi.',
    stats: { icon: Flame, value: 47, label: '🔥' },
  },
  {
    type: 'challenge',
    name: '30-Day Mobility',
    sport: 'Challenge',
    content: '142 athletes joined. 3 days remaining.',
    stats: { icon: Users, value: 142, label: 'Joined' },
  },
  {
    type: 'pr',
    name: 'Alex K.',
    sport: 'Powerlifter',
    content: 'New bench PR! 225 lb. 8 weeks of programming paying off.',
    stats: { icon: Trophy, value: 225, label: 'lb' },
  },
  {
    type: 'leaderboard',
    name: 'Top This Month',
    sport: 'Leaderboard',
    content: '1. Sarah M. — 342 pts\n2. James K. — 318 pts\n3. Lisa T. — 295 pts',
    stats: { icon: Flame, value: 342, label: 'Top Score' },
  },
  {
    type: 'achievement',
    name: 'Marcus R.',
    sport: 'Triathlete',
    content: 'Earned "7-Day Streak" badge. Consistent training pays off.',
    stats: { icon: CalendarDays, value: 7, label: 'Day Streak' },
  },
  {
    type: 'group',
    name: 'Marathon Prep Squad',
    sport: '47 Members',
    content: '12 workouts logged today. Group long run this Saturday.',
    stats: { icon: Users, value: 47, label: 'Members' },
  },
];

export function CommunitySection() {
  return (
    <section className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Your team. Your tribe. Your edge.
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                Training is better together. The community that keeps athletes showing up,
                day after day.
              </p>
            </FadeInView>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {feedCards.map((card, i) => (
              <motion.div
                key={i}
                className={cn(
                  'break-inside-avoid p-5 rounded-lg bg-surface-3 border border-surface-6',
                  'hover:-translate-y-1 hover:border-brand-primary/20 transition-all duration-300'
                )}
                variants={{
                  hidden: { opacity: 0, y: 24, rotate: (i % 3 - 1) * 1 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    rotate: 0,
                    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
                  },
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-surface-4 flex items-center justify-center text-caption font-bold text-text-secondary">
                    {card.name[0]}
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-text-primary">{card.name}</p>
                    <p className="text-caption text-text-tertiary">{card.sport}</p>
                  </div>
                </div>
                <p className="text-body-sm text-text-secondary mb-3 whitespace-pre-line">
                  {card.content}
                </p>
                <div className="flex items-center gap-3 text-caption text-text-tertiary">
                  <card.stats.icon className="w-4 h-4 text-brand-primary" />
                  <span className="text-text-secondary font-semibold">
                    {card.stats.label.startsWith('🔥') || card.stats.label.startsWith('🏆') ? card.stats.label : ''}{' '}
                    <CountUp end={card.stats.value} />
                    {!card.stats.label.startsWith('🔥') && !card.stats.label.startsWith('🏆') ? ` ${card.stats.label}` : ''}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
