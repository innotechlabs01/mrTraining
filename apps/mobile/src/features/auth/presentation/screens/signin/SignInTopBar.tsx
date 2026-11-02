import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../../shared/theme/tokens';
import { ChevronLeftIcon } from '../../../../../shared/components/icons';
import { texts } from '../../../../../shared/i18n/texts';
import type { SignInMode } from './useSignInForm';

const t = texts.screens.signIn;

type Props = {
  mode: SignInMode;
  canGoBack: boolean;
  onBack: () => void;
};

// FitBody lime title on top bar → MR primary.
export function SignInTopBar({ mode, canGoBack, onBack }: Props) {
  return (
    <View style={styles.topBar}>
      {canGoBack ? (
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={texts.common.back}
        >
          <ChevronLeftIcon size={26} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.backBtnPlaceholder} />
      )}
      <Text style={styles.topTitle}>{mode === 'signin' ? t.signInTitle : t.signUpTitle}</Text>
      <View style={styles.backBtnPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.base,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: { width: 32, height: 32 },
  topTitle: {
    fontFamily: fontFamilies.display,
    fontSize: typography.h4.fontSize,
    lineHeight: 24,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
