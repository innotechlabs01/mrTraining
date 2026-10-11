import { useEffect, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { smartClient as apiClient } from '../../../../../infrastructure/api/client';
import { showToast } from '../../../../../shared/components/ui/Toast';
import {
  clearPendingOnboarding,
  getPendingOnboarding,
  savePendingOnboarding,
  type OnboardingPayload,
} from '../onboardingPending';
import { getCachedCoachCode, cacheCoachCode } from '../coachCodeCache';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.signIn;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignInMode = 'signin' | 'signup';

type UseSignInFormOptions = {
  initialCode?: string | undefined;
  initialMode?: SignInMode | undefined;
  getOnboardingData: () => OnboardingPayload | undefined;
};

export function useSignInForm({
  initialCode,
  initialMode,
  getOnboardingData,
}: UseSignInFormOptions) {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [coachCode, setCoachCode] = useState(initialCode ?? '');
  const [mode, setMode] = useState<SignInMode>(initialMode ?? 'signin');
  const [loading, setLoading] = useState(false);

  // Returning athletes do not need to retype the invite code; auto-fill from cache.
  useEffect(() => {
    let mounted = true;
    getCachedCoachCode().then((cached) => {
      if (mounted && cached && !coachCode) {
        setCoachCode(cached);
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postOnboard = async (onboarding: OnboardingPayload | null | undefined) => {
    try {
      await apiClient.post('/athlete/onboard', {
        sports: onboarding?.sports ?? [],
        modality: onboarding?.modality ?? '',
        experienceLevel: onboarding?.experienceLevel ?? '',
        goal: onboarding?.goal ?? '',
        sessionsPerWeek: onboarding?.sessionsPerWeek ?? 0,
        sessionDuration: onboarding?.sessionDuration ?? 0,
        equipment: onboarding?.equipment ?? '',
        athleteRoutineAccepted: onboarding?.athleteRoutineAccepted ?? true,
      });
    } catch (err) {
      console.error('[Auth] onboard failed:', err);
    }
  };

  const flushPendingOnboarding = async () => {
    const pending = await getPendingOnboarding();
    if (!pending) return;
    await postOnboard(pending);
    await clearPendingOnboarding();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('error', t.errorTitle, t.completeAllFields);
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      showToast('error', t.errorTitle, t.invalidEmail);
      return;
    }

    if (password.length < 8) {
      showToast('error', t.errorTitle, t.passwordTooShort);
      return;
    }

    if (mode === 'signup' && confirmPassword !== password) {
      showToast('error', t.errorTitle, t.passwordsMismatch);
      return;
    }

    if (mode === 'signup' && !coachCode.trim()) {
      showToast('error', t.errorTitle, t.coachCodeMissing);
      return;
    }

    const normalizedCode = coachCode.trim().toUpperCase();

    if (mode === 'signin') {
      if (!signInLoaded) {
        showToast('info', t.waitTitle, t.authInProgress);
        return;
      }
      setLoading(true);
      try {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status === 'complete') {
          if (normalizedCode) cacheCoachCode(normalizedCode);
          await setActive({ session: result.createdSessionId });
          await flushPendingOnboarding();
          if (normalizedCode) {
            try {
              await apiClient.post('/athlete/accept-invite', { code: normalizedCode });
            } catch (err) {
              console.error('[Auth] accept-invite failed on sign-in:', err);
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t.signInFailedFallback;
        showToast('error', t.signInFailedTitle, message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!signUpLoaded) {
        showToast('info', t.waitTitle, t.authInProgress);
        return;
      }
      setLoading(true);
      try {
        const result = await signUp.create({
          emailAddress: email.trim(),
          password,
          unsafeMetadata: { coachCode: normalizedCode },
        });
        if (result.status === 'complete') {
          if (normalizedCode) cacheCoachCode(normalizedCode);
          await setActiveSignUp({ session: result.createdSessionId });
          const onboarding = getOnboardingData();
          await postOnboard(onboarding);
          if (normalizedCode) {
            try {
              await apiClient.post('/athlete/accept-invite', { code: normalizedCode });
            } catch (err) {
              console.error('[Auth] accept-invite failed on sign-up:', err);
            }
          }
        } else {
          const onboarding = getOnboardingData();
          if (onboarding) {
            savePendingOnboarding(onboarding);
          }
          showToast('success', t.checkEmailTitle, t.checkEmailBody);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t.signUpFailedFallback;
        showToast('error', t.signUpFailedTitle, message);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleMode = () => setMode(mode === 'signin' ? 'signup' : 'signin');
  const isLoaded = mode === 'signin' ? signInLoaded : signUpLoaded;

  return {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    confirmPassword,
    setConfirmPassword,
    coachCode,
    setCoachCode,
    mode,
    toggleMode,
    loading,
    isLoaded,
    handleSubmit,
  };
}
