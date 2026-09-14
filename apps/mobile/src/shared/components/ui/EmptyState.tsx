import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { InfoIcon, AlertIcon } from '../icons';
import { Skeleton } from './Skeleton';
import { texts } from '../../i18n/texts';

type Variant = 'empty' | 'error' | 'loading' | 'skeleton';

type Props = {
  variant: Variant;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  onRetry?: () => void;
};

const DEFAULT_TITLE: Record<'empty' | 'error', string> = {
  empty: texts.common.noData,
  error: texts.state.errorTitle,
};
const DEFAULT_MESSAGE: Record<'empty' | 'error', string> = {
  empty: 'No hay información todavía. Intenta refrescar o vuelve más tarde.',
  error: texts.state.errorMessage,
};

/** Empty / error / skeleton states — never a perpetual spinner. Skeleton mirrors the final layout. */
export function EmptyState({ variant, title, message, actionLabel, onAction, onRetry }: Props) {
  const isSkeleton = variant === 'loading' || variant === 'skeleton';
  const buttonLabel = actionLabel ?? (onRetry ? texts.common.retry : undefined);

  if (isSkeleton) {
    return (
      <View testID="empty-state-loading" style={styles.skeletonWrap}>
        <Skeleton.Screen />
      </View>
    );
  }

  const displayTitle = title ?? DEFAULT_TITLE[variant];
  const displayMessage = message ?? DEFAULT_MESSAGE[variant];

  return (
    <View style={styles.container} testID={`empty-state-${variant}`}>
      <View style={styles.illustration}>
        {variant === 'empty' ? <InfoIcon size={32} color={colors.textSecondary} /> : <AlertIcon size={32} color={colors.error} />}
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      {displayMessage ? <Text style={styles.message}>{displayMessage}</Text> : null}
      {buttonLabel && (onAction || onRetry) ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction ?? onRetry}
          style={({ pressed }) => [styles.action, { backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{buttonLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingVertical: spacing.md },
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  illustration: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  action: {
    borderRadius: radius.md,
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  actionLabel: { ...typography.label, color: colors.base, textTransform: 'uppercase' },
  pressed: { opacity: 0.8 },
});
