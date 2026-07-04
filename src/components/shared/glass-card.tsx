import { cn } from '@/shared/lib/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverColor?: 'orange' | 'blue' | 'none';
}

export function GlassCard({ children, className, hoverColor = 'orange' }: GlassCardProps) {
  const hoverClasses = {
    orange: 'hover:border-electric-orange',
    blue: 'hover:border-velocity-blue',
    none: '',
  };

  return (
    <div
      className={cn(
        'glass-card p-10 group transition-all duration-500',
        hoverClasses[hoverColor],
        className,
      )}
    >
      {children}
    </div>
  );
}
