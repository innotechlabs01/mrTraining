import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { showToast } from '../../../../../shared/components/ui/Toast';
import { texts } from '../../../../../shared/i18n/texts';
import { resolveAuthError } from './clerkErrors';

const t = texts.screens.signIn;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResetStage = 'idle' | 'code_sent';

/**
 * Clerk reset_password_email_code flow — isolated state machine.
 *
 * sendCode(email)  → 6-digit code email
 * confirm()        → verify code + set new password + activate session
 * cancel()         → back to sign-in form
 *
 * Verified against Clerk Expo legacy SignInResource type:
 * - prepareFirstFactor requires emailAddressId from supportedFirstFactors
 * - new password is set via resetPassword({ password }) (legacy API)
 */
export function usePasswordReset() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [stage, setStage] = useState<ResetStage>('idle');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async (email: string) => {
    if (!isLoaded) {
      showToast('info', t.waitTitle, t.authInProgress);
      return;
    }
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      showToast('error', t.errorTitle, t.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim() });
      // reset_password_email_code factors always carry emailAddressId
      // (see ResetPasswordEmailCodeFactor in @clerk/shared types).
      const factors = (attempt.supportedFirstFactors ?? []) as Array<{
        strategy: string;
        emailAddressId: string;
      }>;
      const resetFactor = factors.find(
        (f) => f.strategy === 'reset_password_email_code',
      );
      if (!resetFactor) {
        showToast('error', t.errorTitle, t.resetFailed);
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: resetFactor.emailAddressId,
      });
      setStage('code_sent');
      setCode('');
      setNewPassword('');
      showToast('success', t.resetCodeSentTitle, t.resetCodeSentBody);
    } catch (err) {
      const resolved = resolveAuthError(err, 'reset');
      console.error('[Auth] Password reset error:', err);
      showToast(resolved.kind, resolved.title, resolved.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!isLoaded) return;
    if (code.trim().length < 6) {
      showToast('error', t.errorTitle, t.resetCodeInvalid);
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', t.errorTitle, t.passwordTooShort);
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
      });
      if (result.status === 'complete') {
        // Legacy API: set the new password via resetPassword().
        await signIn.resetPassword({ password: newPassword });
        await setActive({ session: result.createdSessionId });
        setStage('idle');
        setCode('');
        setNewPassword('');
        showToast('success', t.resetSuccessTitle, t.resetSuccessBody);
      } else {
        showToast('error', t.errorTitle, t.resetFailed);
      }
    } catch (err) {
      const resolved = resolveAuthError(err, 'reset');
      console.error('[Auth] Password reset confirm error:', err);
      showToast(resolved.kind, resolved.title, resolved.message);
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setStage('idle');
    setCode('');
    setNewPassword('');
  };

  return {
    stage,
    code,
    setCode,
    newPassword,
    setNewPassword,
    loading,
    sendCode,
    confirm,
    cancel,
  };
}
