import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../../shared/theme/tokens';
import { MailIcon, UserIcon, LockIcon, TagIcon } from '../../../../../shared/components/icons';
import { showToast } from '../../../../../shared/components/ui/Toast';
import { texts } from '../../../../../shared/i18n/texts';
import type { SignInMode } from './useSignInForm';

const t = texts.screens.signIn;

type Props = {
  mode: SignInMode;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  coachCode: string;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onCoachCodeChange: (value: string) => void;
};

// FitBody lavanda full-bleed form band → MR surface.
export function SignInFormSection({
  mode,
  email,
  fullName,
  password,
  confirmPassword,
  coachCode,
  onEmailChange,
  onFullNameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onCoachCodeChange,
}: Props) {
  return (
    <View style={styles.formBand}>
      {mode === 'signin' ? (
        <>
          <Text style={styles.fieldLabel}>{t.userOrEmailLabel}</Text>
          <View style={styles.inputWrapper}>
            <MailIcon size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel={t.emailA11y}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>{t.fullNameLabel}</Text>
          <View style={styles.inputWrapper}>
            <UserIcon size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder={t.fullNamePlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={fullName}
              onChangeText={onFullNameChange}
              autoCapitalize="words"
              autoComplete="name"
              accessibilityLabel={t.fullNameLabel}
            />
          </View>

          <Text style={styles.fieldLabel}>{t.emailOrPhoneLabel}</Text>
          <View style={styles.inputWrapper}>
            <MailIcon size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel={t.emailOrPhoneA11y}
            />
          </View>
        </>
      )}

      <Text style={styles.fieldLabel}>{t.passwordLabel}</Text>
      <View style={styles.inputWrapper}>
        <LockIcon size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder={t.passwordPlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel={t.passwordLabel}
        />
      </View>

      {mode === 'signup' && (
        <>
          <Text style={styles.fieldLabel}>{t.confirmPasswordLabel}</Text>
          <View style={styles.inputWrapper}>
            <LockIcon size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={onConfirmPasswordChange}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel={t.confirmPasswordLabel}
            />
          </View>
        </>
      )}

      {/* Coach Code — required for sign-up; optional auto-fill for returning athletes */}
      <Text style={styles.fieldLabel}>{t.coachCodeLabel}{mode === 'signup' ? ' *' : ''}</Text>
      <View style={styles.inputWrapper}>
        <TagIcon size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder={t.coachCodePlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={coachCode}
          onChangeText={onCoachCodeChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          accessibilityLabel={t.coachCodeA11y}
        />
      </View>
      <Text style={styles.codeHint}>
        {mode === 'signup' ? t.coachCodeRequired : t.coachCodeOptional}
      </Text>

      {/* Forgot Password link — right-aligned, only in sign-in mode (FitBody) */}
      {mode === 'signin' && (
        <Pressable
          onPress={() => showToast('info', t.comingSoonTitle, t.comingSoonResetPassword)}
          style={styles.forgotBtn}
          hitSlop={8}
        >
          <Text style={styles.forgotText}>{t.forgotPassword}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formBand: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    color: colors.text,
    paddingVertical: 0,
    height: '100%',
  },
  inputDisabled: {
    opacity: 1,
  },
  codeHint: {
    fontFamily: fontFamilies.body,
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
});
