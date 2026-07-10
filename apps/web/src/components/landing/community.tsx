'use client';

import { SectionReveal, FadeInView, CountUp } from './animation-primitives';
import { motion } from 'framer-motion';
import { Trophy, Flame, CalendarDays, Users, Dumbbell, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from './i18n';

const esCards = [
  {
    type: 'workout',
    name: 'Sofía M.',
    sport: 'Maratonista',
    content: '29 km. Mi récord personal. Promedio de 5:10/km.',
    icon: Dumbbell,
    value: 29,
    label: 'km',
  },
  {
    type: 'challenge',
    name: 'Reto 30 días',
    sport: 'Desafío',
    content: '142 atletas inscritos. Quedan 3 días.',
    icon: Flame,
    value: 142,
    label: 'inscritos',
  },
  {
    type: 'pr',
    name: 'Alex K.',
    sport: 'Powerlifter',
    content: '¡Nuevo récord en press banca! 225 lb. 8 semanas de programación dando frutos.',
    icon: Trophy,
    value: 225,
    label: 'lb',
  },
  {
    type: 'leaderboard',
    name: 'Top del mes',
    sport: 'Tabla de líderes',
    content: '1. Sofía M. — 342 pts\n2. Jaime K. — 318 pts\n3. Lisa T. — 295 pts',
    icon: Flame,
    value: 342,
    label: 'Puntaje top',
  },
  {
    type: 'achievement',
    name: 'Marcos R.',
    sport: 'Triatleta',
    content: '¡Consiguió la insignia "7 días seguidos"! La constancia paga.',
    icon: CalendarDays,
    value: 7,
    label: 'días',
  },
  {
    type: 'group',
    name: 'Maratón Prep Squad',
    sport: '47 Miembros',
    content: '12 entrenos registrados hoy. Rodada larga grupal este sábado.',
    icon: Users,
    value: 47,
    label: 'miembros',
  },
];

const enCards = [
  {
    type: 'workout',
    name: 'Sarah M.',
    sport: 'Marathon Runner',
    content: '18 miles done. New longest run. Averaged 8:12/mi.',
    icon: Dumbbell,
    value: 18,
    label: 'mi',
  },
  {
    type: 'challenge',
    name: '30-Day Mobility',
    sport: 'Challenge',
    content: '142 athletes joined. 3 days remaining.',
    icon: Flame,
    value: 142,
    label: 'Joined',
  },
  {
    type: 'pr',
    name: 'Alex K.',
    sport: 'Powerlifter',
    content: 'New bench PR! 225 lb. 8 weeks of programming paying off.',
    icon: Trophy,
    value: 225,
    label: 'lb',
  },
  {
    type: 'leaderboard',
    name: 'Top This Month',
    sport: 'Leaderboard',
    content: '1. Sarah M. — 342 pts\n2. James K. — 318 pts\n3. Lisa T. — 295 pts',
    icon: Flame,
    value: 342,
    label: 'Top Score',
  },
  {
    type: 'achievement',
    name: 'Marcus R.',
    sport: 'Triathlete',
    content: 'Earned "7-Day Streak" badge. Consistent training pays off.',
    icon: CalendarDays,
    value: 7,
    label: 'Day Streak',
  },
  {
    type: 'group',
    name: 'Marathon Prep Squad',
    sport: '47 Members',
    content: '12 workouts logged today. Group long run this Saturday.',
    icon: Users,
    value: 47,
    label: 'Members',
  },
];

export function CommunitySection() {
  const { es, txt } = useLang();
  const cards = es ? esCards : enCards;

  return (
    <section className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                {txt('Tu equipo. Tu tribu. Tu ventaja.', 'Your team. Your tribe. Your edge.')}
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                {txt('Entrenar juntos es mejor. La comunidad que mantiene a los atletas apareciendo, día tras día.', 'Training is better together. The community that keeps athletes showing up, day after day.')}
              </p>
            </FadeInView>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {cards.map((card, i) => (
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
                  <card.icon className="w-4 h-4 text-brand-primary" />
                  <span className="text-text-secondary font-semibold">
                    <CountUp end={card.value} /> {card.label}
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
