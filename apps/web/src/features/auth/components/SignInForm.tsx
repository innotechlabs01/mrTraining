'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useSignIn } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { ErrorState } from './ErrorState';

interface SignInFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onBack?: () => void;
}

type Step = 'email' | 'password';

export function SignInForm({ onSuccess, onForgotPassword, onBack }: SignInFormProps) {
  const { signIn, isLoaded, setActive } = useSignIn();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailSubmit = async () => {
    if (!isLoaded || !signIn) return;
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signIn.create({ identifier: email });
      setStep('password');
    } catch (err: any) {
      const code = err.errors?.[0]?.code;
      if (code === 'form_identifier_not_found') {
        setError('No account found with this email address');
      } else if (code === 'form_identifier_invalid') {
        setError('Please enter a valid email address');
      } else {
        setError(err.errors?.[0]?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!isLoaded || !signIn || !setActive) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'password',
        password,
      });

      if (result.status === 'needs_second_factor') {
        setError('Two-factor authentication is required.');
      } else if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        onSuccess?.();
      }
    } catch (err: any) {
      const code = err.errors?.[0]?.code;
      const message = err.errors?.[0]?.message;
      if (code === 'form_password_incorrect') {
        setError('Incorrect password. Try again or reset your password.');
      } else if (code === 'user_locked_out') {
        setError('Account temporarily locked due to too many failed attempts. Try again later.');
      } else {
        setError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setError('');
    setPassword('');
  };

  const stepVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorState message={error} onRetry={() => setError('')} />}

      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.div
            key="email"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={stepVariants}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                placeholder="Email address"
                autoComplete="email"
                autoFocus
                className={cn(
                  'h-12 w-full rounded-md bg-surface-2 pl-10 pr-4 text-body-sm text-text-primary',
                  'border border-surface-6 placeholder:text-text-secondary/50',
                  'transition-all duration-200',
                  'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30',
                )}
              />
            </div>

            <button
              type="button"
              onClick={handleEmailSubmit}
              disabled={isLoading || !email.trim()}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white',
                'transition-all duration-200 hover:bg-brand-primary-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
                'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Continue'
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="password"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={stepVariants}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <button
              type="button"
              onClick={handleBackToEmail}
              className="flex items-center gap-2 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{email}</span>
              <span className="shrink-0 text-brand-primary font-medium">Change</span>
            </button>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Password"
                autoComplete="current-password"
                autoFocus
                className={cn(
                  'h-12 w-full rounded-md bg-surface-2 pl-10 pr-10 text-body-sm text-text-primary',
                  'border border-surface-6 placeholder:text-text-secondary/50',
                  'transition-all duration-200',
                  'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={isLoading || !password}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white',
                'transition-all duration-200 hover:bg-brand-primary-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
                'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              Forgot password?
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {onBack && step === 'email' && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to welcome
        </button>
      )}
    </div>
  );
}
