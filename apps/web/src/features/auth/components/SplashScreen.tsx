'use client';

import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/landing/logo';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(handleComplete, 2500);
    return () => clearTimeout(timer);
  }, [handleComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleComplete}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-surface-1 via-surface-0 to-surface-0" />
      <div className="fixed inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_center,_#FF6B00,_transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Logo size="lg" monogramOnly />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="font-display text-h1 tracking-[0.15em] text-white mb-2">
            MR TRAINING
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className="text-body-sm text-text-secondary"
        >
          Your Journey Begins Here
        </motion.p>
      </div>
    </motion.div>
  );
}
