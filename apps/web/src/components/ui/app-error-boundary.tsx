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
  /**
   * Variante de diseño por sección:
   * - 'default': diseño genérico neutro
   * - 'dashboard': para el panel de coach/nutrition/athlete/running/admin
   * - 'auth': para páginas de autenticación
   * - 'marketing': para páginas públicas de marketing
   * - 'payment': para páginas de pago/checkout
   * - 'event': para páginas de eventos
   * - 'invite': para páginas de invitación
   * - 'meet': para sesiones en vivo
   * - 'locale': para rutas internacionalizadas
   * - 'short': para páginas de destino cortas (/l/[slug])
   * - 'uiux': para el showcase de UI/UX
   */
  variant?: 'default' | 'dashboard' | 'auth' | 'marketing' | 'payment' | 'event' | 'invite' | 'meet' | 'locale' | 'short' | 'uiux';
}

const variantConfig: Record<NonNullable<AppErrorBoundaryProps['variant']>, { iconColor: string; borderColor: string; bgTint: string; titleColor: string; descColor: string; buttonVariant: 'primary' | 'secondary' | 'ghost'; secondaryLabel: string; secondaryHref: string }> = {
  default: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-[var(--border)]',
    bgTint: 'bg-black/5',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio',
    secondaryHref: '/',
  },
  dashboard: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-border',
    bgTint: 'bg-surface-0/50 backdrop-blur-sm',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al panel',
    secondaryHref: '/coach/plan',
  },
  auth: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-border',
    bgTint: 'bg-black/30',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio de sesión',
    secondaryHref: '/sign-in',
  },
  marketing: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-brand-primary/30',
    bgTint: 'bg-brand-primary/5',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio',
    secondaryHref: '/',
  },
  payment: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-brand-primary/50',
    bgTint: 'bg-brand-primary/10',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al checkout',
    secondaryHref: '/checkout',
  },
  event: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-brand-primary/30',
    bgTint: 'bg-brand-primary/5',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Ver todos los eventos',
    secondaryHref: '/',
  },
  invite: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-border',
    bgTint: 'bg-black/30',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio',
    secondaryHref: '/',
  },
  meet: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-brand-primary/30',
    bgTint: 'bg-brand-primary/5',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio',
    secondaryHref: '/',
  },
  locale: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-border',
    bgTint: 'bg-black/30',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio',
    secondaryHref: '/',
  },
  short: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-border',
    bgTint: 'bg-black/30',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al inicio',
    secondaryHref: '/',
  },
  uiux: {
    iconColor: 'text-semantic-error',
    borderColor: 'border-brand-primary/50',
    bgTint: 'bg-brand-primary/10',
    titleColor: 'text-[var(--text)]',
    descColor: 'text-[var(--text-secondary)]',
    buttonVariant: 'primary',
    secondaryLabel: 'Volver al showcase',
    secondaryHref: '/ui-ux-pro-max',
  },
};

export function AppErrorBoundary({
  error,
  reset,
  title,
  description,
  variant = 'default',
}: AppErrorBoundaryProps) {
  const cfg = variantConfig[variant];

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col items-center justify-center text-center p-6',
        cfg.bgTint,
        'role="alert" aria-live="polite"'
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center max-w-md w-full border rounded-2xl p-8 shadow-lg',
          cfg.borderColor,
          variant === 'dashboard' ? 'bg-surface-raised border-surface-3' : 'bg-black/40 border-white/10'
        )}
      >
        <AlertCircle size={48} className={cn(cfg.iconColor, 'mb-6')} aria-hidden="true" />
        <h1 className={cn('text-h3 font-semibold', cfg.titleColor, 'mb-2')}>
          {title ?? 'Ha ocurrido un error'}
        </h1>
        <p className={cn('text-body-sm', cfg.descColor, 'mb-8 max-w-sm')}>
          {description ?? 'Algo salió mal al cargar esta página. Inténtalo de nuevo.'}
        </p>
        <Button
          variant={cfg.buttonVariant}
          onClick={() => reset()}
          className="mr-3"
          aria-label="Reintentar"
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Reintentar
        </Button>
        <a
          href={cfg.secondaryHref}
          className={cn(
            'flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md border border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-surface hover:text-[var(--text)] transition-colors duration-200 font-medium text-body-sm w-full sm:w-auto'
          )}
        >
          {cfg.secondaryLabel}
        </a>
        {/* Solo en desarrollo: detalle del error para depuración */}
        {process.env.NODE_ENV === 'development' && (
          <details
            className={cn('mt-8 text-left w-full max-w-xs text-caption', cfg.descColor)}
            style={{ color: cfg.descColor.includes('text-secondary') ? 'var(--text-secondary)' : 'var(--text)' }}
          >
            <summary
              className="cursor-pointer underline decoration-1 decoration-[var(--text-secondary)] mb-2"
            >
              Detalle del error
            </summary>
            <pre className="bg-surface-raised p-3 rounded text-xs overflow-x-auto">
              {error?.message ?? String(error)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

AppErrorBoundary.displayName = 'AppErrorBoundary';
