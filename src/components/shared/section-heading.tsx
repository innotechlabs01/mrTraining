import { cn } from '@/shared/lib/cn';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  accentColor?: 'orange' | 'blue';
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  align = 'left',
  accentColor = 'orange',
  className,
}: SectionHeadingProps) {
  const accentClass = accentColor === 'orange' ? 'bg-electric-orange' : 'bg-velocity-blue';

  return (
    <div
      className={cn(
        'mb-16',
        align === 'center' ? 'text-center' : 'text-center md:text-left',
        className,
      )}
    >
      <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-4">
        {title}
      </h2>
      <div
        className={cn('h-1 w-24', accentClass, align === 'center' ? 'mx-auto' : 'mx-auto md:mx-0')}
      />
      {subtitle && <p className="text-on-surface-variant mt-4 max-w-xl font-body-md">{subtitle}</p>}
    </div>
  );
}
