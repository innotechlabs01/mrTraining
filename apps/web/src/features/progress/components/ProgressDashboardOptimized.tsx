'use client';

import dynamic from 'next/dynamic';
import type { Insight } from '../services/analytics';
import { ProgressDashboardSkeleton } from './ProgressDashboardSkeleton';
import { ProgressErrorBoundary } from './ProgressErrorBoundary';

interface SportScore {
  label: string;
  score: number;
  color: string;
  icon: React.ElementType;
  metrics: { label: string; value: string | number }[];
}

interface TrendData {
  sportLabel: string;
  color: string;
  trend: 'up' | 'down' | 'stable';
  data: { date: string; value: number }[];
}

const ProgressDashboardInner = dynamic(
  () => import('./ProgressDashboard').then((mod) => ({ default: mod.ProgressDashboard })),
  {
    loading: () => <ProgressDashboardSkeleton />,
    ssr: false,
  }
);

interface ProgressDashboardOptimizedProps {
  sportScores: SportScore[];
  trends: TrendData[];
  insights: Insight[];
  className?: string;
}

export function ProgressDashboardOptimized({
  sportScores,
  trends,
  insights,
  className,
}: ProgressDashboardOptimizedProps) {
  return (
    <ProgressErrorBoundary>
      <ProgressDashboardInner
        sportScores={sportScores}
        trends={trends}
        insights={insights}
        className={className}
      />
    </ProgressErrorBoundary>
  );
}
