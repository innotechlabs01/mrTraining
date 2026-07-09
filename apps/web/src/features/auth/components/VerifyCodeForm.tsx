'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { CodeInput } from './CodeInput';
import { ErrorState } from './ErrorState';

interface VerifyCodeFormProps {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

const RESEND_COOLDOWN = 60;

export function VerifyCodeForm({ email, onSuccess, onBack }: VerifyCodeFormProps) {
  const { signUp, isLoaded } = useSignUp();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isResendDisabled = resendCooldown > 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startResendTimer = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    clearTimer();
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleVerify = useCallback(async (verificationCode: string) => {
    if (!isLoaded || !verificationCode || verificationCode.length < 6) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      if (result.status === 'complete') {
        onSuccess?.();
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      if (err.errors?.[0]?.code === 'form_code_incorrect') {
        setError('Invalid code. Please check and try again.');
      } else {
        setError(err.errors?.[0]?.message || 'Failed to verify code');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signUp, onSuccess]);

  const handleChange = useCallback((value: string) => {
    setCode(value);
    setError('');
  }, []);

  const handleComplete = useCallback((value: string) => {
    if (!hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      handleVerify(value);
    }
  }, [handleVerify, hasAutoSubmitted]);

  const handleResend = useCallback(async () => {
    if (!isLoaded || isResendDisabled) return;
    setError('');

    try {
      await signUp.prepareEmailAddressVerification();
      startResendTimer();
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to resend code');
    }
  }, [isLoaded, signUp, isResendDisabled, startResendTimer]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="verify"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col gap-6"
      >
        <div className="flex items-center justify-center gap-2 rounded-md bg-surface-2 border border-surface-6 px-4 py-3">
          <Mail className="h-5 w-5 text-brand-primary" />
          <span className="text-body-sm text-text-secondary">
            Code sent to{' '}
            <span className="font-medium text-text-primary">{email}</span>
          </span>
        </div>

        {error && (
          <ErrorState message={error} onRetry={() => setError('')} />
        )}

        <CodeInput
          value={code}
          onChange={handleChange}
          onComplete={handleComplete}
          error={error}
          isLoading={isLoading}
        />

        <button
          type="button"
          onClick={() => handleVerify(code)}
          disabled={isLoading || !code || code.length < 6}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white',
            'transition-all duration-200 hover:bg-brand-primary-hover',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Verify Email'
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResendDisabled || isLoading}
            className={cn(
              'text-body-sm transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 rounded',
              isResendDisabled
                ? 'text-text-secondary/50 cursor-not-allowed'
                : 'text-brand-primary hover:text-brand-primary-hover',
            )}
          >
            {isResendDisabled ? `Resend code in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
