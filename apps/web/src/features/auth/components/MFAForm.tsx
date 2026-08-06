'use client';

import { useState, useCallback } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Smartphone, Mail, ArrowLeft, Loader2, Check } from 'lucide-react';
import { CodeInput } from './CodeInput';
import { ErrorState } from './ErrorState';
import { ClerkApiError } from '../clerk-errors';

interface MFAFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

type MFAMethod = 'authenticator' | 'phone' | 'email';

interface MethodOption {
  id: MFAMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
  clerkStrategy: string;
}

const methods: MethodOption[] = [
  {
    id: 'authenticator',
    label: 'Authenticator App',
    description: 'Use Google Authenticator or similar',
    icon: <Shield className="h-8 w-8" />,
    clerkStrategy: 'totp',
  },
  {
    id: 'phone',
    label: 'SMS',
    description: 'Receive a code via text message',
    icon: <Smartphone className="h-8 w-8" />,
    clerkStrategy: 'phone_code',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Receive a code via email',
    icon: <Mail className="h-8 w-8" />,
    clerkStrategy: 'email_code',
  },
];

export function MFAForm({ onSuccess, onBack }: MFAFormProps) {
  const { signIn, isLoaded, setActive } = useSignIn();

  const [step, setStep] = useState<'select' | 'verify'>('select');
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const selectedMethodConfig = methods.find((m) => m.id === selectedMethod);
  const factors = signIn?.supportedSecondFactors;

  const handleSelectMethod = useCallback((method: MFAMethod) => {
    setSelectedMethod(method);
    setError('');
  }, []);

  const handleContinue = useCallback(async () => {
    if (!isLoaded || !selectedMethod || !selectedMethodConfig) return;
    setIsLoading(true);
    setError('');

    try {
      await signIn.prepareSecondFactor({
        strategy: selectedMethodConfig.clerkStrategy,
      } as Parameters<typeof signIn.prepareSecondFactor>[0]);
      setStep('verify');
    } catch (err: unknown) {
      const clerkErr = err as ClerkApiError;
      setError(clerkErr.errors?.[0]?.message || 'Failed to prepare verification');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, selectedMethod, selectedMethodConfig]);

  const handleVerify = useCallback(async (verificationCode: string) => {
    if (!isLoaded || !selectedMethod || !selectedMethodConfig || !verificationCode || verificationCode.length < 6) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptSecondFactor({
        code: verificationCode,
        strategy: selectedMethodConfig.clerkStrategy as 'totp' | 'phone_code',
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        onSuccess?.();
      }
    } catch (err: unknown) {
      const clerkErr = err as ClerkApiError;
      if (clerkErr.errors?.[0]?.code === 'form_code_incorrect') {
        setError('Invalid code. Please try again.');
      } else {
        setError(clerkErr.errors?.[0]?.message || 'Verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, selectedMethod, selectedMethodConfig, setActive, onSuccess]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setError('');
  }, []);

  const handleCodeComplete = useCallback((value: string) => {
    if (!hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      handleVerify(value);
    }
  }, [handleVerify, hasAutoSubmitted]);

  const handleChangeMethod = useCallback(() => {
    setStep('select');
    setCode('');
    setError('');
    setHasAutoSubmitted(false);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {step === 'select' && (
        <motion.div
          key="select"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div className="text-center">
            <p className="text-h3 font-display font-semibold text-text-primary mb-1">
              Choose your verification method
            </p>
            <p className="text-body-sm text-text-secondary">
              Select how you&apos;d like to verify your identity
            </p>
          </div>

          {error && (
            <ErrorState message={error} onRetry={() => setError('')} />
          )}

          <div className="flex flex-col gap-3">
            {methods.map((method) => {
              const isSelected = selectedMethod === method.id;
              const isAvailable = !factors || factors.some(
                (f) => f.strategy === method.clerkStrategy,
              );

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleSelectMethod(method.id)}
                  disabled={!isAvailable}
                  className={cn(
                    'relative flex items-center gap-4 rounded-lg p-4 text-left',
                    'bg-[rgba(255,255,255,0.05)] backdrop-blur-[16px]',
                    'border transition-all duration-200',
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
                    !isAvailable && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                      isSelected ? 'text-brand-primary' : 'text-text-secondary',
                    )}
                  >
                    {method.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-text-primary">
                      {method.label}
                    </p>
                    <p className="text-caption text-text-secondary mt-0.5">
                      {method.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                      isSelected
                        ? 'border-brand-primary bg-brand-primary'
                        : 'border-surface-6',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isLoading || !selectedMethod}
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
              Back
            </button>
          )}
        </motion.div>
      )}

      {step === 'verify' && (
        <motion.div
          key="verify"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div className="text-center">
            <div
              className={cn(
                'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg',
                'text-brand-primary bg-brand-primary/10',
              )}
            >
              {selectedMethodConfig?.icon}
            </div>
            <p className="text-h3 font-display font-semibold text-text-primary mb-1">
              {selectedMethodConfig?.label}
            </p>
            <p className="text-body-sm text-text-secondary">
              Enter the 6-digit verification code
            </p>
          </div>

          {error && (
            <ErrorState message={error} onRetry={() => setError('')} />
          )}

          <CodeInput
            value={code}
            onChange={handleCodeChange}
            onComplete={handleCodeComplete}
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
              'Verify'
            )}
          </button>

          <button
            type="button"
            onClick={handleChangeMethod}
            className="text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary text-center"
          >
            Use a different method
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
