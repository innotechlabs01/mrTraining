import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, leadingIcon, trailingIcon, disabled, className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] flex items-center pointer-events-none">
            {leadingIcon}
          </span>
        )}

        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            // Base
            'w-full bg-surface-raised border border-[var(--border)] rounded-lg px-3 py-2',
            'text-body text-[var(--text)] placeholder:text-[var(--text-muted)]',
            'transition-colors duration-200 outline-none',
            // Focus
            'focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30',
            // Error
            error && 'border-semantic-error ring-1 ring-semantic-error/30',
            // Disabled
            disabled && 'opacity-40 cursor-not-allowed',
            // Icon padding
            leadingIcon && 'pl-9',
            trailingIcon && 'pr-9',
            className
          )}
          {...props}
        />

        {trailingIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] flex items-center pointer-events-none">
            {trailingIcon}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
