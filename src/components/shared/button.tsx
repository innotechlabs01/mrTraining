import { cn } from '@/shared/lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-label-bold uppercase tracking-widest transition-all duration-200 active:scale-95';

  const variantClasses = {
    primary: 'bg-electric-orange text-on-primary-container hover:opacity-90 shadow-[0_0_20px_rgba(255,92,0,0.4)]',
    outline: 'border border-on-surface hover:bg-white hover:text-black',
    ghost: 'text-on-surface hover:text-electric-orange',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-label-bold',
    lg: 'px-8 py-5 text-label-bold',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
