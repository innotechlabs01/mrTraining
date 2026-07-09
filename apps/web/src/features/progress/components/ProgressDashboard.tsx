'use client';

import { memo, useMemo } from 'react';
import { SportScoreCard } from './SportScoreCard';
import { ProgressComparisonChart } from './ProgressComparisonChart';
import { ProgressTrendChart } from './ProgressTrendChart';
import { ActionableInsights } from './ActionableInsights';
import { SPORTS_CONFIG } from './sports-config';
import type { Insight } from '../services/analytics';

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

interface ProgressDashboardProps {
  sportScores: SportScore[];
  trends: TrendData[];
  insights: Insight[];
  className?: string;
}

function ProgressDashboardBase({ sportScores, trends, insights, className }: ProgressDashboardProps) {
  const chartSports = useMemo(
    () =>
      sportScores.map((s) => ({
        label: s.label,
        score: s.score,
        color: s.color,
        icon: s.icon,
      })),
    [sportScores]
  );

  const sportCards = useMemo(
    () =>
      sportScores.map((sport) => {
        const config = SPORTS_CONFIG[sport.label.toLowerCase()];
        return (
          <SportScoreCard
            key={sport.label}
            sportLabel={sport.label}
            icon={sport.icon}
            color={sport.color}
            score={sport.score}
            metrics={sport.metrics}
          />
        );
      }),
    [sportScores]
  );

  const trendCharts = useMemo(
    () =>
      trends.map((t) => (
        <ProgressTrendChart
          key={t.sportLabel}
          data={t.data}
          sportLabel={t.sportLabel}
          color={t.color}
          trend={t.trend}
        />
      )),
    [trends]
  );

  return (
    <div className={className}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Progress Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Multi-sport performance comparison and insights
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {sportCards}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ProgressComparisonChart sports={chartSports} />
        <ActionableInsights insights={insights} />
      </div>

      {trends.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Trends Over Time</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trendCharts}
          </div>
        </div>
      )}
    </div>
  );
}

export const ProgressDashboard = memo(ProgressDashboardBase);
