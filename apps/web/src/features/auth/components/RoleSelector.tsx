'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ClipboardList, Users, Medal, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleSelectorProps {
  onSelect: (role: 'athlete' | 'coach' | 'parent' | 'strength-coach') => void;
  onSkip?: () => void;
}

const roles = [
  {
    id: 'athlete' as const,
    icon: Dumbbell,
    title: "I'm an Athlete",
    description: 'Track your performance, follow programs, and connect with coaches',
    accent: 'text-brand-primary',
  },
  {
    id: 'coach' as const,
    icon: ClipboardList,
    title: "I'm a Coach",
    description: 'Create programs, manage athletes, and analyze performance',
    accent: 'text-teal-accent',
  },
  {
    id: 'parent' as const,
    icon: Users,
    title: "I'm a Parent",
    description: "Monitor progress and support your athlete's journey",
    accent: 'text-violet-accent',
  },
  {
    id: 'strength-coach' as const,
    icon: Medal,
    title: "I'm a Strength Coach",
    description: 'Design conditioning programs and track development',
    accent: 'text-coral-accent',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export function RoleSelector({ onSelect, onSkip }: RoleSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center mb-2">
        <h2 className="text-h3 font-display text-text-primary mb-2">
          What brings you here?
        </h2>
        <p className="text-body-sm text-text-secondary">
          Pick the option that best describes you
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selected === role.id;

            return (
              <motion.button
                key={role.id}
                variants={cardVariants}
                layout
                onClick={() => setSelected(role.id)}
                className={cn(
                  'glass-card rounded-lg p-6 flex flex-col items-start gap-3 text-left transition-all duration-200',
                  'hover:border-brand-primary/30 hover:scale-[1.02]',
                  isSelected && 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary',
                )}
              >
                <div className={cn('p-2.5 rounded-md bg-surface-3', role.accent)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-body-sm font-semibold text-text-primary">
                    {role.title}
                  </span>
                  <span className="text-caption text-text-secondary leading-relaxed">
                    {role.description}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <div className="flex flex-col gap-3 mt-2">
        <button
          onClick={() => selected && onSelect(selected as 'athlete' | 'coach' | 'parent' | 'strength-coach')}
          disabled={!selected}
          className={cn(
            'w-full h-12 rounded-md font-semibold text-body-sm transition-all duration-200',
            'bg-brand-primary text-white',
            'hover:bg-brand-primary-hover active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2',
          )}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="text-body-sm text-text-secondary hover:text-text-primary transition-colors text-center"
          >
            Skip for now
          </button>
        )}
      </div>
    </motion.div>
  );
}
