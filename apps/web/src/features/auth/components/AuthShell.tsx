'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/landing/logo';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function AuthShell({ children, title, subtitle, className, maxWidth = 'md' }: AuthShellProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-surface-1 via-surface-0 to-surface-0" />
      <div className="fixed inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top,_#FF6B00,_transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center w-full">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8"
        >
          <Logo size="md" />
        </motion.div>

        <div className={cn('w-full', maxWidths[maxWidth], className)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-center mb-8"
            >
              <h1 className="text-h2 font-display text-text-primary mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-body-sm text-text-secondary">
                  {subtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="glass-card rounded-lg p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
