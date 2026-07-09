'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  Heart,
  BarChart3,
  RefreshCw,
  Eye,
  Dumbbell,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAthletes } from '../../hooks/useAthletes';

interface Insight {
  id: string;
  icon: typeof TrendingUp;
  color: string;
  title: string;
  description: string;
  actionLabel: string;
  actionIcon: typeof Eye;
}

function buildInsights(athleteNames: string[]): Insight[] {
  return [
    {
      id: 'insight-1',
      icon: TrendingUp,
      color: 'text-success',
      title: 'Performance Trend',
      description: `${athleteNames[0] || 'Marcus'} improved 400m time by 2.3% this week`,
      actionLabel: 'View Athlete',
      actionIcon: Eye,
    },
    {
      id: 'insight-2',
      icon: AlertTriangle,
      color: 'text-error',
      title: 'Anomaly Detected',
      description: `${athleteNames[2] || 'David'}'s HRV dropped 35% — possible overtraining`,
      actionLabel: 'View Athlete',
      actionIcon: Eye,
    },
    {
      id: 'insight-3',
      icon: Activity,
      color: 'text-brand-primary',
      title: 'Readiness Prediction',
      description:
        'Tomorrow 3 athletes high readiness, 2 low — prepare adjusted load',
      actionLabel: 'Adjust Program',
      actionIcon: Dumbbell,
    },
    {
      id: 'insight-4',
      icon: Heart,
      color: 'text-violet-accent',
      title: 'Recovery Recommendation',
      description:
        'Add recovery day for Wednesday — team average HRV trending down',
      actionLabel: 'Adjust Program',
      actionIcon: Dumbbell,
    },
    {
      id: 'insight-5',
      icon: BarChart3,
      color: 'text-success',
      title: 'Team Comparison',
      description:
        'Team avg recovery score up 8% vs last week — keep current protocol',
      actionLabel: 'Dismiss',
      actionIcon: X,
    },
  ];
}

export default function AIInsights() {
  const { athletes, isLoading: athletesLoading } = useAthletes();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const athleteNames = useMemo(
    () => athletes.map((a) => a.name),
    [athletes],
  );

  const insights = useMemo(
    () => buildInsights(athleteNames).filter((i) => !dismissedInsights.has(i.id)),
    [athleteNames, dismissedInsights],
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDismissedInsights((prev) => new Set(prev).add(id));
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-surface-1 p-12">
        <AlertTriangle className="h-8 w-8 text-error" />
        <p className="text-sm text-secondary">Failed to load insights</p>
        <button
          type="button"
          onClick={handleRetry}
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-surface-3" />
          <div className="h-5 w-32 animate-pulse rounded bg-surface-3" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg bg-surface-2"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-surface-1 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3">
          <Brain className="h-8 w-8 text-[#6B7280]" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-white">All caught up</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            No new insights at this time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-brand-primary" />
        <h2 className="text-xl font-semibold font-display text-white">AI Insights</h2>
        <span className="rounded bg-brand-primary/15 px-2 py-0.5 text-xs font-semibold text-brand-primary">
          LIVE
        </span>
      </div>

      <AnimatePresence>
        {insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08, ease: 'easeOut' }}
            className="glass-card group relative overflow-hidden rounded-xl p-4"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  'bg-surface-3',
                )}
              >
                <insight.icon className={cn('h-5 w-5', insight.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">
                    {insight.title}
                  </h4>
                  <span className="rounded bg-brand-primary/15 px-1.5 py-0.5 text-xs font-semibold text-brand-primary">
                    AI
                  </span>
                </div>
                <p className="text-sm text-secondary">
                  {insight.description}
                </p>

                <button
                  type="button"
                  onClick={() => handleDismiss(insight.id)}
                  className={cn(
                    'mt-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
                    'transition-all duration-200',
                    insight.actionLabel === 'Dismiss'
                      ? 'bg-surface-3 text-[#6B7280] hover:text-white'
                      : 'bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25',
                  )}
                >
                  <insight.actionIcon className="h-3.5 w-3.5" />
                  {insight.actionLabel}
                </button>
              </div>
            </div>

            <div className="absolute right-0 top-0 h-full w-1">
              <div
                className={cn(
                  'h-full w-full rounded-r-xl',
                  insight.id === 'insight-1' && 'bg-success',
                  insight.id === 'insight-2' && 'bg-error',
                  insight.id === 'insight-3' && 'bg-brand-primary',
                  insight.id === 'insight-4' && 'bg-violet-accent',
                  insight.id === 'insight-5' && 'bg-success',
                )}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
