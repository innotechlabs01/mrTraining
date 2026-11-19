'use client';

import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  variation?: {
    text: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
  badge?: string;
}

export function MetricCard({
  title,
  value,
  variation,
  icon,
  subtitle,
  className,
  badge,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#26262B] bg-[#16161A] p-5 sm:p-6 text-white shadow-xl transition-all duration-200 hover:border-[#383842]',
        className
      )}
    >
      {/* Top Header: Title & Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#8E8E93]">{title}</p>
          {badge && (
            <span className="inline-block rounded-full bg-[#E07A3D]/20 px-2 py-0.5 text-[10px] font-bold text-[#E07A3D]">
              {badge}
            </span>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#202026] text-[#A1A1AA] group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
      </div>

      {/* Center: Big Bold Number */}
      <div className="my-3">
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums">
          {value}
        </div>
        {subtitle && <p className="mt-1 text-xs text-[#8E8E93]">{subtitle}</p>}
      </div>

      {/* Bottom: Variation trend */}
      <div className="flex items-center justify-between text-xs">
        {variation ? (
          <div
            className={cn(
              'flex items-center gap-1 font-semibold',
              variation.isNeutral
                ? 'text-[#8E8E93]'
                : variation.isPositive !== false
                ? 'text-emerald-400'
                : 'text-rose-400'
            )}
          >
            <span>{variation.text}</span>
          </div>
        ) : (
          <span className="text-xs text-[#71717A]">Actualizado en tiempo real</span>
        )}
        <div className="text-[#52525B] group-hover:text-[#8E8E93] transition-colors">
          <ArrowRightLeft size={14} />
        </div>
      </div>
    </div>
  );
}
