import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'primary';
type Size = 'sm' | 'md' | 'lg';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceRaised, fg: colors.textSecondary },
  success: { bg: `${colors.success}22`, fg: colors.success },
  warning: { bg: `${colors.warning}22`, fg: colors.warning },
  error: { bg: `${colors.error}22`, fg: colors.error },
  primary: { bg: `${colors.primary}22`, fg: colors.primary },
};

// Visual pill heights (non-interactive) — never 44px on a plain status pill.
const SIZE_HEIGHT: Record<Size, number> = { sm: 20, md: 24, lg: 28 };

type Props = {
  text: string;
  tone?: Tone;
  size?: Size;
  /** Interactive badges get a 44px tap target; non-interactive pills stay compact. */
  interactive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  icon?: React.ReactNode;
};

export function Badge({
  text,
  tone = 'neutral',
  size = 'md',
  interactive = false,
  onPress,
  disabled = false,
  selected = false,
  loading = false,
  error = false,
  empty = false,
  icon,
}: Props) {
  const { bg, fg } = TONE_STYLES[tone];
  const isInteractive = interactive || !!onPress;
  const Component = isInteractive ? Pressable : View;

  return (
    <Component
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityState={{ disabled, selected, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.badge,
        { backgroundColor: bg },
        { height: SIZE_HEIGHT[size] },
        isInteractive && styles.interactive,
        onPress && !disabled && !loading && pressed && styles.pressed,
        disabled && styles.disabled,
        selected && styles.selected,
        loading && styles.loading,
        error && styles.error,
        empty && styles.empty,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: fg },
              size === 'lg' && styles.textLg,
              disabled && styles.textDisabled,
              selected && styles.textSelected,
            ]}
          >
            {text}
          </Text>
        </>
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  interactive: { minHeight: 44, minWidth: 44, paddingHorizontal: spacing.md },
  text: { ...typography.label, fontSize: 10, lineHeight: 14 },
  textLg: { fontSize: 11 },
  textDisabled: { opacity: 0.5 },
  textSelected: { color: colors.primary },
  pressed: { opacity: 0.8 },
  loading: { opacity: 0.6 },
  error: { backgroundColor: colors.error, opacity: 0.9 },
  empty: { backgroundColor: colors.surfaceRaised, opacity: 0.5 },
  disabled: { opacity: 0.6 },
  selected: { backgroundColor: `${colors.primary}22` },
});
