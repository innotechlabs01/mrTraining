import * as React from 'react';
import { Inbox, AlertCircle, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  variant?: 'empty' | 'loading' | 'error' | 'offline';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'empty',
  title,
  description,
  icon,
  action,
  className,
}) => {
  if (variant === 'loading') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center max-w-sm mx-auto gap-3 py-12',
          className
        )}
        role="status"
        aria-label="Loading"
      >
        <div className="w-full flex flex-col gap-3">
          <div className="animate-pulse bg-surface-raised rounded h-4 w-3/4 mx-auto" />
          <div className="animate-pulse bg-surface-raised rounded h-4 w-full" />
          <div className="animate-pulse bg-surface-raised rounded h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  const resolvedTitle =
    title ??
    (variant === 'offline'
      ? 'Sin conexión'
      : variant === 'error'
        ? 'Something went wrong'
        : 'Nothing here yet');

  const resolvedDescription =
    description ??
    (variant === 'offline' ? 'Verifica tu conexión a internet' : undefined);

  const resolvedIcon =
    icon ??
    (variant === 'error' ? (
      <AlertCircle size={40} className="text-semantic-error" />
    ) : variant === 'offline' ? (
      <WifiOff size={40} className="text-[var(--text-muted)]" />
    ) : (
      <Inbox size={40} className="text-[var(--text-muted)]" />
    ));

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center max-w-sm mx-auto gap-3 py-12',
        className
      )}
    >
      {resolvedIcon && <span>{resolvedIcon}</span>}

      {resolvedTitle && (
        <h3 className="text-h4 font-semibold text-[var(--text)]">{resolvedTitle}</h3>
      )}

      {resolvedDescription && (
        <p className="text-body-sm text-[var(--text-secondary)]">{resolvedDescription}</p>
      )}

      {action && (
        <Button
          variant={variant === 'error' ? 'destructive' : 'primary'}
          size="md"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
