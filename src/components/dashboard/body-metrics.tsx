'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseProgressMetricRepository } from '@/infrastructure/database/pocketbase.progress-metric-repo';
import type { ProgressMetric } from '@/domain/entities';
import type { MetricType } from '@/shared/types';
import { cn } from '@/shared/lib/cn';

const progressMetricRepo = new PocketBaseProgressMetricRepository();

interface MetricDisplay {
  label: string;
  value: string;
  unit: string;
  color: 'orange' | 'blue';
}

const METRIC_CONFIG: Record<string, { label: string; color: 'orange' | 'blue' }> = {
  weight: { label: 'WEIGHT', color: 'orange' },
  body_fat: { label: 'BODY FAT %', color: 'blue' },
  bench: { label: 'BENCH', color: 'orange' },
  squat: { label: 'SQUAT', color: 'blue' },
  deadlift: { label: 'DEADLIFT', color: 'orange' },
};

function SkeletonMetric() {
  return (
    <div className="bg-[#0F0F0F] rounded-lg p-4 flex flex-col items-center justify-center">
      <div className="animate-pulse">
        <div className="h-2 bg-white/10 rounded w-16 mb-3" />
        <div className="h-6 bg-white/10 rounded w-20 mb-1" />
        <div className="h-2 bg-white/10 rounded w-12" />
      </div>
    </div>
  );
}

function MetricItem({ metric }: { metric: MetricDisplay }) {
  const textShadowColor =
    metric.color === 'orange' ? 'rgba(255,107,0,0.6)' : 'rgba(59,130,246,0.6)';

  return (
    <div className="bg-[#0F0F0F] rounded-lg p-4 flex flex-col items-center justify-center">
      <p className="text-[#C4C7C7]/60 text-[10px] font-semibold uppercase tracking-wider mb-2 font-['Inter']">
        {metric.label}
      </p>
      <p
        className="text-white text-[24px] font-bold leading-none mb-1 font-['Montserrat']"
        style={{ textShadow: `0 0 16px ${textShadowColor}` }}
      >
        {metric.value}
      </p>
      <p className="text-[#C4C7C7]/40 text-[10px] font-medium font-['Inter']">
        {metric.unit}
      </p>
    </div>
  );
}

export function BodyMetrics() {
  const { userId } = useAuth();
  const [metrics, setMetrics] = useState<MetricDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const result = await progressMetricRepo.findByUserId(userId);

        if (result.isFailure) {
          setLoading(false);
          return;
        }

        const allMetrics = result.value;

        const targetTypes: MetricType[] = ['weight', 'body_fat', 'bench', 'squat', 'deadlift'];
        const latestByType = new Map<MetricType, ProgressMetric>();

        for (const metric of allMetrics) {
          if (
            targetTypes.includes(metric.metricType) &&
            (!latestByType.has(metric.metricType) ||
              metric.recordedAt > latestByType.get(metric.metricType)!.recordedAt)
          ) {
            latestByType.set(metric.metricType, metric);
          }
        }

        const displayMetrics: MetricDisplay[] = targetTypes.map((type) => {
          const config = METRIC_CONFIG[type];
          const metric = latestByType.get(type);

          return {
            label: config.label,
            value: metric ? metric.value.toLocaleString() : '—',
            unit: metric ? metric.unit : '',
            color: config.color,
          };
        });

        setMetrics(displayMetrics);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [userId]);

  if (loading) {
    return (
      <div
        className={cn(
          'bg-[#141618] border rounded-xl p-6 transition-all duration-300',
          'border-[rgba(0,102,255,0.2)]',
          'shadow-[0_0_30px_rgba(0,102,255,0.08)]'
        )}
      >
        <p className="text-[#C4C7C7]/60 text-[11px] font-semibold uppercase tracking-wider mb-4 font-['Inter']">
          Body Metrics
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-[#141618] border rounded-xl p-6 transition-all duration-300',
        'border-[rgba(0,102,255,0.2)]',
        'shadow-[0_0_30px_rgba(0,102,255,0.08)]',
        'hover:shadow-[0_0_40px_rgba(0,102,255,0.12)]'
      )}
    >
      <p className="text-[#C4C7C7]/60 text-[11px] font-semibold uppercase tracking-wider mb-4 font-['Inter']">
        Body Metrics
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((metric) => (
          <MetricItem key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}
