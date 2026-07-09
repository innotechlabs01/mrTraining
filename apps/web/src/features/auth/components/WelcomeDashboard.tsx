'use client';

import { motion } from 'framer-motion';
import { Sparkles, Target, Trophy, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeDashboardProps {
  userName?: string;
  onGoToDashboard: () => void;
}

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Coaching',
    description: 'Personalized programs adapt to your performance',
  },
  {
    icon: Target,
    title: 'Smart Analytics',
    description: 'Track progress with real-time insights',
  },
  {
    icon: Trophy,
    title: 'Goal Tracking',
    description: 'Set milestones and celebrate achievements',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.6,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export function WelcomeDashboard({ userName, onGoToDashboard }: WelcomeDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [1, 0.9, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <CheckCircle className="h-20 w-20 text-success" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
        className="text-center"
      >
        <h1 className="text-h1 font-display text-gradient-orange mb-2">
          {userName ? `Welcome, ${userName}!` : 'Welcome to MR Training!'}
        </h1>
        <p className="text-body text-text-secondary">
          Your account is ready. Let&apos;s start your journey.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="flex flex-col gap-3 rounded-lg p-4 glass-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                <Icon className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-body-sm font-semibold text-text-primary mb-1">
                  {feature.title}
                </h3>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1, ease: 'easeOut' }}
      >
        <button
          type="button"
          onClick={onGoToDashboard}
          className={cn(
            'flex h-12 items-center justify-center gap-2 rounded-md px-8 font-semibold text-body-sm transition-all duration-200',
            'bg-brand-primary text-white',
            'hover:bg-brand-primary-hover active:scale-[0.98]',
          )}
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}
