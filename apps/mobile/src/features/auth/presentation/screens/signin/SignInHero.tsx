import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, fontFamilies } from '../../../../../shared/theme/tokens';
import { texts } from '../../../../../shared/i18n/texts';
import type { SignInMode } from './useSignInForm';

const t = texts.screens.signIn;

// Centered hero header — Welcome / Let's Start! with mode-aware copy.
export function SignInHero({ mode }: { mode: SignInMode }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>{mode === 'signin' ? t.heroSignInTitle : t.heroSignUpTitle}</Text>
      <Text style={styles.heroSubtitle}>
        {mode === 'signin' ? t.heroSignInSubtitle : t.heroSignUpSubtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.base,
    gap: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamilies.display,
    fontSize: typography.h1.fontSize,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
