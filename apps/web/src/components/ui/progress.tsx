import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<ProgressProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'bg-[var(--bg-elevated)] rounded-full overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      <div
        className="bg-gradient-to-r from-brand-primary/70 to-brand-primary transition-all duration-500 rounded-full h-full"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
