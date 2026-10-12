import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../../shared/theme/tokens';
import { HashIcon, LockIcon } from '../../../../../shared/components/icons';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.signIn;

type Props = {
  email: string;
  code: string;
  newPassword: string;
  loading: boolean;
  onCodeChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onResend: () => void;
};

// Reset-password band — 6-digit code + new password, Clerk reset_password_email_code flow.
export function ResetPasswordSection({
  email,
  code,
  newPassword,
  loading,
  onCodeChange,
  onNewPasswordChange,
  onConfirm,
  onCancel,
  onResend,
}: Props) {
  return (
    <View style={styles.formBand}>
      <Text style={styles.header}>{t.resetCodeSentTitle}</Text>
      <Text style={styles.hint}>
        {t.resetCodeSentBody} ({email})
      </Text>

      <Text style={styles.fieldLabel}>{t.resetCodeLabel}</Text>
      <View style={styles.inputWrapper}>
        <HashIcon size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder={t.resetCodePlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={code}
          onChangeText={onCodeChange}
          keyboardType="number-pad"
          maxLength={6}
          accessibilityLabel={t.resetCodeLabel}
        />
      </View>
      <Pressable onPress={onResend} style={styles.resendBtn} hitSlop={12} disabled={loading}>
        <Text style={styles.resendText}>{t.resetResendButton}</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>{t.resetNewPasswordLabel}</Text>
      <View style={styles.inputWrapper}>
        <LockIcon size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder={t.passwordPlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={newPassword}
          onChangeText={onNewPasswordChange}
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel={t.resetNewPasswordLabel}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.primaryBtnPressed,
          (loading || code.trim().length < 6 || newPassword.length < 8) && styles.primaryBtnDisabled,
        ]}
        onPress={onConfirm}
        disabled={loading || code.trim().length < 6 || newPassword.length < 8}
        accessibilityLabel={t.resetConfirmButton}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? t.submitLoading : t.resetConfirmButton}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
        onPress={onCancel}
        hitSlop={8}
      >
        <Text style={styles.cancelText}>{t.resetCancelButton}</Text>
      </Pressable>
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
  header: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.h4.fontSize,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
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
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
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
  cancelBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  cancelBtnPressed: { opacity: 0.6 },
  cancelText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
  resendBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  resendText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodySmall.fontSize,
    color: colors.primary,
  },
});
