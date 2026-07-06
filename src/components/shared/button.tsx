import { cn } from '@/shared/lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
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
  const baseClasses =
    'font-label-bold uppercase tracking-widest transition-all duration-200 active:scale-95';

  const variantClasses = {
    primary:
      'bg-electric-orange text-black hover:opacity-90 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
    secondary: 'bg-performance-blue text-white hover:opacity-90',
    outline: 'border-2 border-white text-white hover:bg-white hover:text-black',
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
