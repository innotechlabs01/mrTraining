import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'offline';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-base',
};

const statusDotSizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-2.5 h-2.5',
  xl: 'w-3 h-3',
};

const statusColorClasses: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-semantic-success',
  away: 'bg-semantic-warning',
  offline: 'bg-[var(--border)]',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Generic user silhouette icon
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-1/2 h-1/2"
    aria-hidden="true"
  >
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
);

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className,
}) => {
  return (
    <div className={cn('relative inline-flex shrink-0', sizeClasses[size], className)}>
      {src ? (
        <img
          src={src}
          alt={name ?? 'Avatar'}
          className="w-full h-full rounded-full object-cover"
        />
      ) : name ? (
        <span
          className={cn(
            'flex items-center justify-center w-full h-full rounded-full',
            'bg-brand-primary/20 text-brand-primary font-semibold select-none'
          )}
        >
          {getInitials(name)}
        </span>
      ) : (
        <span
          className={cn(
            'flex items-center justify-center w-full h-full rounded-full',
            'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
          )}
        >
          <UserIcon />
        </span>
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg)]',
            statusDotSizeClasses[size],
            statusColorClasses[status]
          )}
          aria-label={status}
        />
      )}
    </div>
  );
};
