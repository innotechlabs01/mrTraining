'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useSignIn } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { ErrorState } from './ErrorState';
import { translateClerkError } from '../clerk-errors';

interface SignInFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onBack?: () => void;
  role?: string;
}

type Step = 'email' | 'password';

export function SignInForm({ onSuccess, onForgotPassword, onBack, role }: SignInFormProps) {
  const searchParams = useSearchParams();
  const { signIn, isLoaded, setActive } = useSignIn();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const plan = searchParams.get('plan');
  const signUpHref = `/sign-up${plan ? `?plan=${plan}` : ''}`;
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const redirectUrlComplete = '/coach';

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_apple') => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete,
      });
    } catch (err: unknown) {
      setError(translateClerkError(err, 'No se pudo iniciar con el proveedor.'));
    }
  };

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
    } catch (err: unknown) {
      setError(translateClerkError(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
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
    } catch (err: unknown) {
      setError(translateClerkError(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
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

      {step === 'email' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleOAuth('oauth_google')}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-surface-6 bg-white text-body-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth('oauth_apple')}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-surface-6 bg-white text-body-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-6" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-text-secondary">Or continue with email</span>
            </div>
          </div>
        </div>
      )}

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

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to welcome
              </button>
            )}
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

      <div className="text-center text-body-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link href={signUpHref} className="text-brand-primary font-semibold transition-colors duration-200 hover:text-brand-primary-hover">
          Sign up
        </Link>
      </div>
    </div>
  );
}
