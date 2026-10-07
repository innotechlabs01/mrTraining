import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../../shared/theme/tokens';
import { showToast } from '../../../../../shared/components/ui/Toast';
import { texts } from '../../../../../shared/i18n/texts';
import type { SignInMode } from './useSignInForm';

const t = texts.screens.signIn;

type Props = {
  mode: SignInMode;
  loading: boolean;
  isLoaded: boolean;
  onSubmit: () => void;
  onToggleMode: () => void;
};

// Actions zone — dark band with terms, primary CTA, social providers, mode switch.
export function SignInActions({ mode, loading, isLoaded, onSubmit, onToggleMode }: Props) {
  return (
    <View style={styles.actions}>
      {/* Terms — only on sign-up, mirrors FitBody purple-band footer */}
      {mode === 'signup' && (
        <Text style={styles.termsText}>
          {t.termsPrefix}
          <Text style={styles.termsAccent}>{t.termsTerms}</Text>
          <Text style={styles.termsText}>{t.termsSeparator}</Text>
          <Text style={styles.termsAccent}>{t.termsPrivacy}</Text>
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.primaryBtnPressed,
          (loading || !isLoaded) && styles.primaryBtnDisabled,
        ]}
        onPress={onSubmit}
        disabled={loading || !isLoaded}
        accessibilityLabel={mode === 'signin' ? t.signInTitle : t.signUpTitle}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? t.submitLoading : mode === 'signin' ? t.signInTitle : t.signUpTitle}
        </Text>
      </Pressable>

      <Text style={styles.orText}>{mode === 'signin' ? t.orSignUpWith : t.orSignInWith}</Text>

      {/* Social row — FitBody G / f / fingerprint → MR surfaceRaised cards */}
      <View style={styles.socialRow}>
        <Pressable
          style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
          onPress={() => showToast('info', t.comingSoonTitle, t.comingSoonGoogle)}
          accessibilityLabel={t.continueWithGoogle}
        >
          <Text style={styles.socialIcon}>G</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
          onPress={() => showToast('info', t.comingSoonTitle, t.comingSoonFacebook)}
          accessibilityLabel={t.continueWithFacebook}
        >
          <Text style={[styles.socialIcon, styles.socialIconFacebook]}>f</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
          onPress={() => showToast('info', t.comingSoonTitle, t.comingSoonBiometrics)}
          accessibilityLabel={t.continueWithBiometrics}
        >
          <Text style={styles.socialIcon}>◉</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.switchBtn}
        onPress={onToggleMode}
        hitSlop={8}
      >
        <Text style={styles.switchText}>
          {mode === 'signin' ? t.noAccountPrefix : t.hasAccountPrefix}
          <Text style={styles.switchAccent}>{mode === 'signin' ? t.signUpTitle : t.signInTitle}</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  termsText: {
    fontFamily: fontFamilies.body,
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  termsAccent: {
    color: colors.primary,
    fontFamily: fontFamilies.bodySemiBold,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.xs,
  },
  primaryBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    color: colors.base,
    fontWeight: '700',
  },
  orText: {
    fontFamily: fontFamilies.body,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  socialIcon: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.h4.fontSize,
    color: colors.primary,
    fontWeight: '700',
  },
  socialIconFacebook: {
    fontFamily: fontFamilies.displayBold,
    fontSize: typography.h3.fontSize,
    color: colors.primary,
  },
  switchBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  switchText: {
    fontFamily: fontFamilies.body,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  switchAccent: {
    fontFamily: fontFamilies.bodyBold,
    color: colors.primary,
    fontWeight: '700',
  },
});
