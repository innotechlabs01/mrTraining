'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shared primitives for the platform admin surface. Every admin page renders a
// page header, a surface card, status badges and (on mobile) stacked cards
// instead of a horizontally clipped table. Keeping them here is what makes the
// six admin screens look like one product instead of six.

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0';

export const inputClass =
  'w-full rounded-lg border border-surface-6 bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary transition-colors focus:border-brand-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary';

export const primaryButtonClass =
  `inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export const secondaryButtonClass =
  `inline-flex items-center justify-center gap-2 rounded-lg border border-surface-6 bg-surface-2 px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

/** Same visual weight as the secondary button, for anchors/Links. */
export const SecondaryLinkClass = secondaryButtonClass;

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-surface-6 bg-surface-1',
        className,
      )}
    >
      {children}
    </section>
  );
}

const BADGE_TONES = {
  neutral: 'border-surface-6 bg-surface-3 text-text-secondary',
  brand: 'border-brand-primary/20 bg-brand-primary/10 text-brand-primary',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  error: 'border-error/20 bg-error/10 text-error',
} as const;

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-text-secondary">
          {icon}
        </span>
      ) : null}
      <div className="max-w-[400px] space-y-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description ? (
          <p className="text-xs text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar...',
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cn(inputClass, 'pl-9')}
      />
    </div>
  );
}

/**
 * Native <dialog> in modal mode: the browser gives us the top layer, focus
 * containment, `Esc`, light dismiss and focus return to the invoker, so we do
 * NOT add role="dialog"/aria-modal, a focus trap or a keydown handler.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-modal-title"
      onCancel={(event) => {
        // Native Esc/back-gesture: keep React state in sync instead of letting
        // the element close behind the app's back.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Light dismiss: a click on the dialog element itself (not its content)
        // lands on the ::backdrop area.
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-surface-6 bg-surface-1 p-0 text-text-primary shadow-2xl max-h-[calc(100dvh-2rem)] overscroll-contain backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        size,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-surface-6 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 id="admin-modal-title" className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary',
            FOCUS_RING,
          )}
        >
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      {footer ? (
        <div className="flex flex-col gap-2 border-t border-surface-6 p-4 sm:flex-row sm:justify-end sm:p-5">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

/** Label + value pair used by mobile card layouts and detail modals. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium text-text-primary">{children}</dd>
    </div>
  );
}

/** Toolbar row shared by the table cards (title + filters). */
export function CardToolbar({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-surface-6 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {meta}
      </div>
      {children ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div> : null}
    </div>
  );
}
