'use client';

import { useState, useCallback } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { CodeInput } from './CodeInput';
import { ErrorState } from './ErrorState';

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

type Step = 'email' | 'reset' | 'success';

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { signIn, isLoaded, setActive } = useSignIn();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = useCallback(async () => {
    if (!isLoaded || !email.trim()) return;
    setIsLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep('reset');
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, email]);

  const handleReset = useCallback(async () => {
    if (!isLoaded || !code || code.length < 6 || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      if (result.status === 'needs_new_password') {
        await signIn.resetPassword({ password: newPassword });
      }

      setStep('success');
    } catch (err: any) {
      if (err.errors?.[0]?.code === 'form_code_incorrect') {
        setError('Invalid code. Please try again.');
      } else {
        setError(err.errors?.[0]?.message || 'Failed to reset password');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, code, newPassword, confirmPassword]);

  const handleBack = useCallback(() => {
    if (step === 'reset') {
      setStep('email');
      setCode('');
      setError('');
    } else {
      onBack?.();
    }
  }, [step, onBack]);

  return (
    <AnimatePresence mode="wait">
      {step === 'email' && (
        <motion.div
          key="email"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div className="text-center">
            <p className="text-body-sm text-text-secondary">
              Enter your email and we'll send you a reset code
            </p>
          </div>

          {error && (
            <ErrorState message={error} onRetry={() => setError('')} />
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="forgot-email" className="text-caption text-text-secondary font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                className={cn(
                  'h-12 w-full rounded-md bg-surface-2 pl-10 pr-4 text-body-sm text-text-primary',
                  'border border-surface-6 placeholder:text-text-secondary/50',
                  'transition-all duration-200',
                  'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={isLoading || !email.trim()}
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
              'Send Reset Code'
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </motion.div>
      )}

      {step === 'reset' && (
        <motion.div
          key="reset"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div className="text-center">
            <p className="text-body-sm text-text-secondary">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-text-primary">{email}</span>
            </p>
          </div>

          {error && (
            <ErrorState message={error} onRetry={() => setError('')} />
          )}

          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={(c) => setCode(c)}
            error={error}
            isLoading={isLoading}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="new-password" className="text-caption text-text-secondary font-medium">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                disabled={isLoading}
                className={cn(
                  'h-12 w-full rounded-md bg-surface-2 pl-10 pr-10 text-body-sm text-text-primary',
                  'border border-surface-6 placeholder:text-text-secondary/50',
                  'transition-all duration-200',
                  'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                tabIndex={-1}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm-password" className="text-caption text-text-secondary font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isLoading}
                className={cn(
                  'h-12 w-full rounded-md bg-surface-2 pl-10 pr-10 text-body-sm text-text-primary',
                  'border border-surface-6 placeholder:text-text-secondary/50',
                  'transition-all duration-200',
                  'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !code || code.length < 6 || !newPassword || newPassword !== confirmPassword}
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
              'Reset Password'
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to email
          </button>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6 py-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>

          <div className="text-center">
            <p className="text-h3 font-display font-semibold text-text-primary mb-1">
              Password Reset
            </p>
            <p className="text-body-sm text-text-secondary">
              Your password has been successfully reset
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white',
              'transition-all duration-200 hover:bg-brand-primary-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
            )}
          >
            Back to Sign In
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
