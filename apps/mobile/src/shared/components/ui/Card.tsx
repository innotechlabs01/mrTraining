import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { colors, layout, radius, shadows } from '../../theme/tokens';

type Props = ViewProps & {
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
};

/** Surface container with complete state support. Depth from tonal layering + hairline border. */
export function Card({
  style,
  children,
  variant = 'default',
  onPress,
  disabled = false,
  selected = false,
  loading = false,
  error = false,
  empty = false,
  ...rest
}: Props) {
  const Component = onPress ? Pressable : View;

  return (
    <Component
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled, selected, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        onPress && !disabled && !loading && pressed && styles.pressed,
        disabled && styles.disabled,
        selected && styles.selected,
        loading && styles.loading,
        error && styles.error,
        empty && styles.empty,
        style,
      ]}
      {...rest}
    >
      {children}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.cardPadding,
    ...shadows.sm,
  },
  elevated: { ...shadows.md },
  outlined: { borderWidth: 1 },
  pressed: { backgroundColor: colors.surfaceRaised },
  disabled: { opacity: 0.6 },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: `${colors.primary}1A` },
  loading: { opacity: 0.7 },
  error: { borderColor: colors.error },
  empty: { opacity: 0.5 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
