'use client';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/landing/logo';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="animate-pulse opacity-80">
        <Logo monogramOnly size="lg" />
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      <p className="text-body-sm text-text-secondary">{message}</p>
    </div>
  );
}
