import { useEffect, useState } from 'react';
import { useAuth, useClerk, useSignIn, useSignUp } from '@clerk/clerk-expo';
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
import { resolveAuthError } from './clerkErrors';

const t = texts.screens.signIn;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignInMode = 'signin' | 'signup';

type UseSignInFormOptions = {
  initialCode?: string | undefined;
  initialMode?: SignInMode | undefined;
  getOnboardingData: () => OnboardingPayload | undefined;
};

/**
 * Email/password sign-in + sign-up form state.
 *
 * Concerns kept OUT of this hook (single responsibility):
 * - Password reset flow → usePasswordReset()
 * - Error copy/mapping → clerkErrors.resolveAuthError()
 * - Session routing on auth success → SignInScreen redirect effect
 */
export function useSignInForm({
  initialCode,
  initialMode,
  getOnboardingData,
}: UseSignInFormOptions) {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
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

  const acceptInviteIfPresent = async (normalizedCode: string) => {
    if (!normalizedCode) return;
    try {
      await apiClient.post('/athlete/accept-invite', { code: normalizedCode });
    } catch (err) {
      console.error('[Auth] accept-invite failed:', err);
    }
  };

  /** Post-session-success side effects shared by sign-in and sign-up. */
  const afterSessionActive = async (normalizedCode: string, flushOnboarding: boolean) => {
    if (normalizedCode) cacheCoachCode(normalizedCode);
    if (flushOnboarding) {
      await flushPendingOnboarding();
    } else {
      const onboarding = getOnboardingData();
      await postOnboard(onboarding);
    }
    await acceptInviteIfPresent(normalizedCode);
  };

  /**
   * Clerk's internal navigation can throw (e.g. "Cannot read property 'href'")
   * AFTER the session was already created. Recover by activating the session
   * directly instead of failing the whole sign-in.
   */
  const recoverSessionFromInternalError = async (
    err: unknown,
  ): Promise<boolean> => {
    if (!(err instanceof TypeError) || !setActive) return false;
    const sessionCreated = (signIn as { createdSessionId?: string | null })
      .createdSessionId;
    if (!sessionCreated) return false;
    try {
      await setActive({ session: sessionCreated });
      return true;
    } catch (activateErr) {
      console.error('[Auth] session activate recovery failed:', activateErr);
      return false;
    }
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
      if (isSignedIn) {
        showToast('info', t.errorTitle, 'Ya tienes una sesión activa.');
        return;
      }
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
          await setActive({ session: result.createdSessionId });
          await afterSessionActive(normalizedCode, true);
        } else {
          showToast('error', t.signInFailedTitle, t.signInFailedFallback);
        }
      } catch (err: unknown) {
        if (await recoverSessionFromInternalError(err)) return;
        const resolved = resolveAuthError(err, 'signin');
        console.error('[Auth] Sign-in error:', err);
        showToast(resolved.kind, resolved.title, resolved.message);
        // Stale client session (backend has session, local says signed-out):
        // clear it so the next attempt works.
        if (resolved.shouldSignOut && !isSignedIn) {
          try {
            await signOut();
            showToast('info', t.errorTitle, 'Sesión restaurada. Intenta de nuevo.');
          } catch (soErr) {
            console.error('[Auth] signOut recovery failed:', soErr);
          }
        }
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
          await setActiveSignUp({ session: result.createdSessionId });
          await afterSessionActive(normalizedCode, false);
        } else {
          // Email verification pending — buffer onboarding data for later.
          const onboarding = getOnboardingData();
          if (onboarding) {
            savePendingOnboarding(onboarding);
          }
          showToast('success', t.checkEmailTitle, t.checkEmailBody);
        }
      } catch (err: unknown) {
        const resolved = resolveAuthError(err, 'signup');
        console.error('[Auth] Sign-up error:', err);
        showToast(resolved.kind, resolved.title, resolved.message);
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
    isSignedIn,
  };
}
