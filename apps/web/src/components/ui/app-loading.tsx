'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface AppLoadingProps {
  className?: string;
}

export function AppLoading({ className }: AppLoadingProps) {
  return (
    <div
      className={cn('min-h-screen bg-surface-0', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Cargando…</span>
      <div className="flex h-16 items-center justify-between border-b border-surface-3 px-6">
        <div className="h-6 w-32 rounded bg-surface-raised" />
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-surface-raised" />
          <div className="hidden h-8 w-24 rounded bg-surface-raised sm:block" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 p-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-surface-3 bg-surface-raised p-5"
          >
            <div className="mb-4 h-4 w-1/2 rounded bg-surface-2" />
            <div className="mb-2 h-3 w-full rounded bg-surface-2" />
            <div className="h-3 w-3/4 rounded bg-surface-2" />
            <div className="mt-4 h-8 w-24 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

AppLoading.displayName = 'AppLoading';
