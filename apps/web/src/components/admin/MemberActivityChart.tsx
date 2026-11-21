'use client';

import { useState } from 'react';
import { Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotActivity {
  id: string;
  timeRange: string;
  percentage: number;
  count: number;
  color: string;
  bgRgba: string;
  label: string;
}

const ACTIVITIES: TimeSlotActivity[] = [
  {
    id: 'evening',
    timeRange: '18:00-22:00',
    percentage: 90,
    count: 1420,
    color: '#8B5CF6', // Purple
    bgRgba: 'rgba(139, 92, 246, 0.25)',
    label: 'Pico Nocturno',
  },
  {
    id: 'midday',
    timeRange: '10:00-14:00',
    percentage: 89,
    count: 1395,
    color: '#F59E0B', // Yellow/Gold
    bgRgba: 'rgba(245, 158, 11, 0.25)',
    label: 'Mediodía HIIT',
  },
  {
    id: 'afternoon',
    timeRange: '14:00-18:00',
    percentage: 65,
    count: 980,
    color: '#10B981', // Green
    bgRgba: 'rgba(16, 185, 129, 0.25)',
    label: 'Tarde Fitness',
  },
  {
    id: 'morning',
    timeRange: '08:00-10:00',
    percentage: 30,
    count: 450,
    color: '#3B82F6', // Blue
    bgRgba: 'rgba(59, 130, 246, 0.25)',
    label: 'Madrugadores',
  },
];

export function MemberActivityChart() {
  const [hovered, setHovered] = useState<TimeSlotActivity | null>(null);

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold tracking-tight text-white">Member Activity</h3>
        <span className="flex items-center gap-1 rounded-full bg-[#202028] px-2.5 py-1 text-[11px] font-medium text-[#8E8E93]">
          <Clock size={12} /> Hoy
        </span>
      </div>

      {/* Styled Circle cluster matching screenshot visual */}
      <div className="relative my-4 flex h-48 sm:h-52 items-center justify-center">
        {/* Purple Circle (90%) */}
        <button
          type="button"
          onMouseEnter={() => setHovered(ACTIVITIES[0])}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'absolute left-4 top-2 flex h-32 w-32 sm:h-36 sm:w-36 flex-col items-center justify-center rounded-full transition-all duration-300 shadow-lg',
            hovered?.id === 'evening' ? 'scale-105 z-20 brightness-110' : 'z-10'
          )}
          style={{
            backgroundColor: '#8B5CF6',
            boxShadow: '0 0 25px rgba(139, 92, 246, 0.4)',
          }}
        >
          <span className="text-xl sm:text-2xl font-black text-white">90%</span>
          <span className="text-[10px] text-white/80 font-medium">18:00-22:00</span>
        </button>

        {/* Yellow Circle (89%) */}
        <button
          type="button"
          onMouseEnter={() => setHovered(ACTIVITIES[1])}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'absolute right-8 top-4 flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-full transition-all duration-300 shadow-md',
            hovered?.id === 'midday' ? 'scale-105 z-20 brightness-110' : 'z-10'
          )}
          style={{
            backgroundColor: '#F59E0B',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
          }}
        >
          <span className="text-lg sm:text-xl font-black text-white">89%</span>
          <span className="text-[9px] text-white/90 font-medium">10:00-14:00</span>
        </button>

        {/* Green Circle (65%) */}
        <button
          type="button"
          onMouseEnter={() => setHovered(ACTIVITIES[2])}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'absolute right-12 bottom-1 flex h-20 w-20 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-full transition-all duration-300 shadow-md',
            hovered?.id === 'afternoon' ? 'scale-105 z-20 brightness-110' : 'z-10'
          )}
          style={{
            backgroundColor: '#10B981',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
          }}
        >
          <span className="text-base sm:text-lg font-black text-white">65%</span>
          <span className="text-[9px] text-white/90 font-medium">14:00-18:00</span>
        </button>

        {/* Blue Circle (30%) */}
        <button
          type="button"
          onMouseEnter={() => setHovered(ACTIVITIES[3])}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'absolute right-2 bottom-12 flex h-14 w-14 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-full transition-all duration-300 shadow-sm',
            hovered?.id === 'morning' ? 'scale-105 z-20 brightness-110' : 'z-10'
          )}
          style={{
            backgroundColor: '#3B82F6',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
          }}
        >
          <span className="text-xs sm:text-sm font-black text-white">30%</span>
        </button>
      </div>

      {/* Hover Information / Live Activity summary */}
      <div className="rounded-xl border border-[#26262B] bg-[#101014] p-2.5 text-xs text-[#8E8E93] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#E07A3D]" />
          <span>
            {hovered ? (
              <strong className="text-white">
                {hovered.timeRange}: {hovered.count} atletas ({hovered.percentage}%)
              </strong>
            ) : (
              'Pasa el cursor sobre los círculos para detalle'
            )}
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold">+12% vs ayer</span>
      </div>

      {/* Legend below */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {ACTIVITIES.map((act) => (
          <div key={act.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: act.color }}
            />
            <span className="text-[#8E8E93] text-[11px] truncate">{act.timeRange}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
