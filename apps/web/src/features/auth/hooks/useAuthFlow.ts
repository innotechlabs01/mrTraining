'use client';

import { useState, useCallback } from 'react';
import type { AuthStep, UserRole, MfaMethod } from '../types';

export function useAuthFlow() {
  const [step, setStep] = useState<AuthStep>('splash');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = useCallback((s: AuthStep) => {
    setStep(s);
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Something went wrong';
    setError(message);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    step,
    email,
    setEmail,
    password,
    setPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    role,
    setRole,
    mfaMethod,
    setMfaMethod,
    orgId,
    setOrgId,
    inviteToken,
    setInviteToken,
    isLoading,
    setIsLoading,
    error,
    setError,
    goTo,
    handleError,
    clearError,
  };
}
