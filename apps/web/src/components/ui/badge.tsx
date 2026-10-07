import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  showDot?: boolean;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-surface text-[var(--text-secondary)] border border-[var(--border)]',
  success: 'bg-semantic-success-soft text-semantic-success',
  warning: 'bg-semantic-warning-soft text-semantic-warning',
  error: 'bg-semantic-error-soft text-semantic-error',
  info: 'bg-semantic-info-soft text-semantic-info',
  outline: 'border border-[var(--border)] text-[var(--text-secondary)] bg-transparent',
};

const dotVariantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-semantic-success',
  warning: 'bg-semantic-warning',
  error: 'bg-semantic-error',
  info: 'bg-semantic-info',
  outline: 'bg-[var(--text-muted)]',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', showDot = false, children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-caption font-medium rounded-full',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotVariantClasses[variant])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
