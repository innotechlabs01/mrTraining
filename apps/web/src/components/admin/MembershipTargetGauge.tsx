'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipTargetGaugeProps {
  percentage?: number;
  variation?: string;
  targetCount?: number;
  todayCount?: number;
}

export function MembershipTargetGauge({
  percentage = 75.55,
  variation = '+10%',
  targetCount = 200,
  todayCount = 250,
}: MembershipTargetGaugeProps) {
  const [selectedTier, setSelectedTier] = useState<'Gold' | 'Silver' | 'Platinum' | 'Total'>('Gold');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Semicircular SVG gauge calculations
  // Angle from 180 deg (left) to 0 deg (right)
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half circle
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
      {/* Header with Dropdown */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold tracking-tight text-white">Membership Target</h3>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-1.5 text-xs font-semibold text-white hover:border-[#383842] transition-colors"
          >
            <span>{selectedTier}</span>
            <ChevronDown size={14} className="text-[#8E8E93]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 w-32 rounded-xl border border-[#26262B] bg-[#1B1B22] p-1 shadow-2xl animate-in fade-in zoom-in-95">
              {(['Gold', 'Silver', 'Platinum', 'Total'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTier(t);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                    selectedTier === t ? 'bg-[#E07A3D] text-white' : 'text-[#D1D1D6] hover:bg-[#26262B]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Semicircle Radial Gauge */}
      <div className="relative my-2 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 180 110"
          className="w-56 sm:w-64 overflow-visible"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E07A3D" />
              <stop offset="50%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="#26262B"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled Progress Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute top-12 flex flex-col items-center text-center">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {percentage}%
          </span>
          <span className="mt-1 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
            {variation}
          </span>
        </div>

        {/* Subtitle text */}
        <p className="mt-3 text-xs text-[#8E8E93]">It&apos;s higher than yesterday</p>
      </div>

      {/* Bottom Target vs Today Split Counters */}
      <div className="grid grid-cols-2 gap-4 border-t border-[#26262B] pt-4 text-center">
        <div className="space-y-0.5">
          <p className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">Target</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-lg font-bold text-white">{targetCount}</span>
            <ArrowDown size={14} className="text-rose-400" />
          </div>
        </div>

        <div className="space-y-0.5 border-l border-[#26262B]">
          <p className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">Today</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-lg font-bold text-emerald-400">{todayCount}</span>
            <ArrowUp size={14} className="text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
