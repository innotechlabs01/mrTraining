/**
 * AccessGate — feature gate wrapper for premium athlete features.
 *
 * Renders `children` when the athlete has an active subscription. Renders a
 * Paywall (upsell screen) when the subscription is inactive/expired, with a
 * CTA to view plans.
 *
 * Fail-closed: while loading or on error, access is denied until the status
 * resolves successfully.
 */

import { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../application/useSubscription';
import { Paywall } from './Paywall';
import {
  colors,
  spacing,
  layout,
  typography,
  radius,
} from '../../../shared/theme/tokens';
import { texts } from '../../../shared/i18n/texts';

type Props = {
  children: React.ReactNode;
};

/**
 * AccessGate — wrapper that gates premium content behind an active subscription.
 *
 * - loading: shows a centered activity indicator (fail-closed).
 * - error: shows error state with retry (fail-closed).
 * - success + hasActive: renders children.
 * - success + !hasActive: renders Paywall.
 */
export function AccessGate({ children }: Props) {
  const state = useSubscription();

  const handleRetry = useCallback(() => {
    void state.refetch();
  }, [state.refetch]);

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{texts.common.loading}</Text>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>{texts.state.errorTitle}</Text>
          <Text style={styles.errorMessage}>
            {state.error.message ?? texts.state.errorMessage}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleRetry}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>{texts.common.retry}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // state.status === 'success'
  if (!state.hasActive) {
    return <Paywall />;
  }

  return (
    <SafeAreaView style={styles.childrenWrapper}>{children}</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    height: layout.touchTarget,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  retryText: {
    ...typography.label,
    color: colors.base,
    fontWeight: '700',
  },
  childrenWrapper: { flex: 1, backgroundColor: colors.base },
});
