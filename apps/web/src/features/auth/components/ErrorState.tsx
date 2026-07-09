'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, X } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-lg border border-error/20 bg-error/10 p-4 backdrop-blur-[16px]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div className="flex-1 min-w-0">
          <p className="text-body-sm text-error font-medium">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 text-error/60 transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-3 rounded bg-brand-primary px-4 py-1.5 text-caption font-semibold text-white',
            'transition-all duration-200 hover:brightness-110',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
          )}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
