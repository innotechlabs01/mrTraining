'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { useSignUp } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { CodeInput } from './CodeInput';
import { ErrorState } from './ErrorState';
import { translateClerkError } from '../clerk-errors';

interface SignUpFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

type Step = 'email' | 'verify' | 'password';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
];

export function SignUpForm({ onSuccess, onBack }: SignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, isLoaded, setActive } = useSignUp();
  const plan = searchParams.get('plan');
  const planType = searchParams.get('planType');
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const startResendCountdown = useCallback(() => {
    setResendCountdown(60);
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(
      () => setResendCountdown((prev) => prev - 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleEmailSubmit = async () => {
    if (!isLoaded || !signUp) return;
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const unsafeMetadata: Record<string, string> = {};
      if (plan) unsafeMetadata.plan = plan;
      if (planType) unsafeMetadata.planType = planType;

      await signUp.create({
        emailAddress: email,
        unsafeMetadata: Object.keys(unsafeMetadata).length > 0 ? unsafeMetadata : undefined,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
      startResendCountdown();
    } catch (err: any) {
      const code = err.errors?.[0]?.code;
      if (code === 'form_identifier_exists') {
        // Email already has an account — send them straight to sign-in, prefilled.
        router.push(`/sign-in?email=${encodeURIComponent(email)}${plan ? `&plan=${plan}` : ''}`);
        return;
      } else {
        setError(translateClerkError(err, 'No se pudo continuar. Inténtalo de nuevo.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = useCallback(async (verificationCode: string) => {
    if (!isLoaded || !signUp || verificationCode.length < 6) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });

      if (result.status === 'complete') {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }
        onSuccess?.();
      } else {
        setStep('password');
      }
    } catch (err: any) {
      setError(translateClerkError(err, 'No se pudo verificar el código. Inténtalo de nuevo.'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signUp, setActive, onSuccess]);

  const handleResendCode = async () => {
    if (!isLoaded || !signUp || resendCountdown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      startResendCountdown();
      setCode('');
    } catch (err: any) {
      setError(translateClerkError(err, 'No se pudo reenviar el código.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!isLoaded || !signUp || !setActive) return;
    const unsatisfied = PASSWORD_REQUIREMENTS.find((r) => !r.test(password));
    if (unsatisfied) return;

    setIsLoading(true);
    setError('');

    try {
      const unsafeMetadata: Record<string, string> = {};
      if (plan) unsafeMetadata.plan = plan;
      if (planType) unsafeMetadata.planType = planType;

      await signUp.update({
        password,
        unsafeMetadata: Object.keys(unsafeMetadata).length > 0 ? unsafeMetadata : undefined,
      });

      if (signUp.createdSessionId) {
        await setActive({ session: signUp.createdSessionId });
        onSuccess?.();
      }
    } catch (err: any) {
      const clerkCode = err.errors?.[0]?.code;
      if (clerkCode === 'form_password_pwned') {
        setPassword('');
        setError(
          'Esta contraseña ha sido comprometida en una filtración de datos. ' +
          'Elige una contraseña diferente y más segura.',
        );
      } else {
        setError(translateClerkError(err, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError('');
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
      {error && error !== 'already_exists' && <ErrorState message={error} onRetry={() => setError('')} />}

      <AnimatePresence mode="wait">
        {step === 'email' && (
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
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={stepVariants}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <p className="text-body-sm text-text-secondary">
                Enter the verification code sent to
              </p>
              <p className="text-body-sm font-medium text-text-primary mt-1">{email}</p>
            </div>

            <CodeInput
              value={code}
              onChange={handleCodeChange}
              onComplete={handleVerify}
              error={error}
              isLoading={isLoading}
            />

            <div className="text-center">
              {resendCountdown > 0 ? (
                <p className="text-caption text-text-secondary">
                  Resend code in{' '}
                  <span className="font-medium text-text-primary">{resendCountdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-body-sm text-brand-primary transition-colors duration-200 hover:text-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setCode(''); }}
              className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </motion.div>
        )}

        {step === 'password' && (
          <motion.div
            key="password"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={stepVariants}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Create a password"
                autoComplete="new-password"
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

            <div className="flex flex-col gap-1.5">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const satisfied = req.test(password);
                return (
                  <div key={req.label} className="flex items-center gap-2">
                    {satisfied ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    )}
                    <span
                      className={cn(
                        'text-caption transition-colors duration-200',
                        satisfied ? 'text-success' : 'text-text-secondary',
                      )}
                    >
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={
                isLoading || !password || PASSWORD_REQUIREMENTS.some((r) => !r.test(password))
              }
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
                'Create Account'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('verify'); setError(''); }}
              className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
