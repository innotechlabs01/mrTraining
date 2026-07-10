import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  monogramOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { monogram: 24, wordmark: 14 },
  md: { monogram: 32, wordmark: 16 },
  lg: { monogram: 40, wordmark: 18 },
};

export function Logo({ className, monogramOnly = false, size = 'md' }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width={s.monogram}
        height={s.monogram}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MR Training"
      >
        <path
          d="M8 4L12 4L12 22L20 22L20 4L24 4L24 36L20 36L20 26L12 26L12 36L8 36Z"
          fill="#FF6B00"
        />
        <path
          d="M28 4L36 4C38.2091 4 40 5.79086 40 8L40 12L36 12L36 8L32 8L32 36L28 36Z"
          fill="#FF6B00"
        />
      </svg>
      {!monogramOnly && (
        <span
          className="font-display font-bold uppercase text-gradient-fire tracking-[0.1em]"
          style={{ fontSize: s.wordmark }}
        >
          TRAINING
        </span>
      )}
    </div>
  );
}
