'use client';

import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface AppNotFoundProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function AppNotFound({
  title,
  description,
  actionLabel = 'Volver al inicio',
  actionHref = '/',
}: AppNotFoundProps) {
  return (
    <div
      className="min-h-screen bg-surface-0 flex flex-col items-center justify-center text-center p-6"
    >
      <Inbox size={48} className="text-[var(--text-muted)] mb-6" aria-hidden="true" />
      <h1 className="text-h3 font-semibold text-[var(--text)] mb-2">
        {title ?? 'Página no encontrada'}
      </h1>
      <p className="text-body-sm text-[var(--text-secondary)] mb-8 max-w-sm">
        {description ??
          'La página que buscas no existe o se ha movido.'}
      </p>
      <a
        href={actionHref}
        className="flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors duration-200 font-medium text-body-sm w-full sm:w-auto"
        aria-label={actionLabel}
      >
        {actionLabel}
      </a>
    </div>
  );
}

AppNotFound.displayName = 'AppNotFound';
