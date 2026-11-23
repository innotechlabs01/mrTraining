'use client';

import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface AppErrorBoundaryProps {
  error: Error;
  reset: () => void;
  title?: string;
  description?: string;
}

export function AppErrorBoundary({
  error,
  reset,
  title,
  description,
}: AppErrorBoundaryProps) {
  return (
    <div
      className="min-h-screen bg-surface-0 flex flex-col items-center justify-center text-center p-6"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle size={48} className="text-semantic-error mb-6" aria-hidden="true" />
      <h1 className="text-h3 font-semibold text-[var(--text)] mb-2">
        {title ?? 'Ha ocurrido un error'}
      </h1>
      <p className="text-body-sm text-[var(--text-secondary)] mb-8 max-w-sm">
        {description ?? 'Algo salió mal al cargar esta página. Inténtalo de nuevo.'}
      </p>
      <Button
        variant="primary"
        onClick={() => reset()}
        className="mr-3"
        aria-label="Reintentar"
      >
        <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
        Reintentar
      </Button>
      <a
        href="/"
        className="flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md border border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-surface hover:text-[var(--text)] transition-colors duration-200 font-medium text-body-sm"
      >
        Volver al inicio
      </a>
      {/* Solo en desarrollo: detalle del error para depuración */}
      {process.env.NODE_ENV === 'development' && (
        <details
          className="mt-8 text-left w-full max-w-xs text-caption text-[var(--text-tertiary)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <summary
            className="cursor-pointer underline decoration-1 decoration-[var(--text-tertiary)] mb-2"
          >
            Detalle del error
          </summary>
          <pre className="bg-surface-raised p-3 rounded text-xs overflow-x-auto">
            {error?.message ?? String(error)}
          </pre>
        </details>
      )}
    </div>
  );
}

AppErrorBoundary.displayName = 'AppErrorBoundary';
