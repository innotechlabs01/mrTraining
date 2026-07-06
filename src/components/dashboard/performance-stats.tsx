'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';
import type { Workout } from '@/domain/entities';
import { cn } from '@/shared/lib/cn';

const workoutRepo = new PocketBaseWorkoutRepository();

interface MetricCard {
  label: string;
  value: string;
  progress: number;
  color: 'orange' | 'blue';
}

function SkeletonCard({ color }: { color: 'orange' | 'blue' }) {
  const borderColor = color === 'orange' ? 'border-[rgba(255,107,0,0.3)]' : 'border-[rgba(59,130,246,0.3)]';
  const glowColor = color === 'orange' ? 'shadow-[0_0_30px_rgba(255,107,0,0.08)]' : 'shadow-[0_0_30px_rgba(59,130,246,0.08)]';
  
  return (
    <div className={cn(
      'bg-[#141618] border rounded-xl p-6 transition-all duration-300',
      borderColor,
      glowColor
    )}>
      <div className="animate-pulse">
        <div className="h-3 bg-white/10 rounded w-1/2 mb-4" />
        <div className="h-12 bg-white/10 rounded w-2/3 mb-4" />
        <div className="h-2 bg-white/10 rounded w-full" />
      </div>
    </div>
  );
}

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const borderColor = metric.color === 'orange' ? 'border-[rgba(255,107,0,0.3)]' : 'border-[rgba(59,130,246,0.3)]';
  const hoverGlow = metric.color === 'orange' 
    ? 'hover:shadow-[0_0_40px_rgba(255,107,0,0.15)]' 
    : 'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]';
  const defaultGlow = metric.color === 'orange' 
    ? 'shadow-[0_0_30px_rgba(255,107,0,0.08)]' 
    : 'shadow-[0_0_30px_rgba(59,130,246,0.08)]';
  const progressBarGradient = metric.color === 'orange'
    ? 'from-[#FF6B00] to-[#FF8C40]'
    : 'from-[#3B82F6] to-[#60A5FA]';
  const progressGlow = metric.color === 'orange'
    ? 'shadow-[0_0_10px_rgba(255,107,0,0.6)]'
    : 'shadow-[0_0_10px_rgba(59,130,246,0.6)]';

  return (
    <div className={cn(
      'bg-[#141618] border rounded-xl p-6 transition-all duration-300 cursor-default',
      borderColor,
      defaultGlow,
      hoverGlow
    )}>
      <p className="text-[#C4C7C7]/60 text-[11px] font-semibold uppercase tracking-wider mb-2 font-['Inter']">
        {metric.label}
      </p>
      <p 
        className="text-white text-[48px] font-bold leading-none mb-4 font-['Montserrat']"
        style={{ textShadow: metric.color === 'orange' ? '0 0 20px rgba(255,107,0,0.5)' : '0 0 20px rgba(59,130,246,0.5)' }}
      >
        {metric.value}
      </p>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
            progressBarGradient,
            progressGlow
          )}
          style={{ width: `${Math.min(metric.progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function PerformanceStats() {
  const { userId } = useAuth();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const result = await workoutRepo.findWorkoutsByUser(userId, { page: 1, perPage: 100 });
        
        if (result.isFailure) {
          setLoading(false);
          return;
        }

        const workouts = result.value.items;
        const now = new Date();
        
        // Workouts This Week
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const workoutsThisWeek = workouts.filter(w => {
          const completedAt = w.completedAt ? new Date(w.completedAt) : null;
          return completedAt && completedAt >= startOfWeek && w.completed;
        }).length;

        // Total Volume (estimated from workout count - placeholder logic)
        const totalVolume = workouts.filter(w => w.completed).length * 2500;

        // Day Streak
        let streak = 0;
        const completedWorkouts = workouts
          .filter(w => w.completed && w.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
        
        if (completedWorkouts.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let checkDate = new Date(today);
          for (const workout of completedWorkouts) {
            const workoutDate = new Date(workout.completedAt!);
            workoutDate.setHours(0, 0, 0, 0);
            
            if (workoutDate.getTime() === checkDate.getTime()) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (workoutDate.getTime() < checkDate.getTime()) {
              break;
            }
          }
        }

        // Calories Burned (estimated)
        const caloriesBurned = workouts.filter(w => w.completed).length * 450;

        setMetrics([
          {
            label: 'Workouts This Week',
            value: workoutsThisWeek.toString(),
            progress: (workoutsThisWeek / 7) * 100,
            color: 'orange',
          },
          {
            label: 'Total Volume (kg)',
            value: totalVolume.toLocaleString(),
            progress: Math.min((totalVolume / 50000) * 100, 100),
            color: 'blue',
          },
          {
            label: 'Day Streak',
            value: `${streak} days`,
            progress: Math.min((streak / 30) * 100, 100),
            color: 'orange',
          },
          {
            label: 'Calories Burned',
            value: caloriesBurned.toLocaleString(),
            progress: Math.min((caloriesBurned / 10000) * 100, 100),
            color: 'blue',
          },
        ]);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard color="orange" />
        <SkeletonCard color="blue" />
        <SkeletonCard color="orange" />
        <SkeletonCard color="blue" />
      </div>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCardComponent key={metric.label} metric={metric} />
      ))}
    </div>
  );
}
