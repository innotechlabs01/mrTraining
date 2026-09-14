import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, radius, spacing, typography } from '../../theme/tokens';

type Variant = 'primary' | 'ghost' | 'outline' | 'subtle';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
};

const HEIGHT: Record<Size, number> = { md: 48, lg: 56 };

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = true,
  disabled = false,
  loading = false,
  error = false,
}: Props) {
  const isActive = disabled || loading || error;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isActive, busy: loading }}
      accessibilityLabel={label}
      disabled={isActive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], alignSelf: fullWidth ? 'stretch' : 'flex-start', paddingHorizontal: fullWidth ? spacing.lg : spacing.xl },
        VARIANT_STYLES[variant],
        variant === 'primary' && error && styles.errorPrimary,
        !isActive && pressed && styles.pressed,
        isActive && styles.disabledBase,
      ]}
    >
      {loading ? (
        <ActivityIndicator testID="primary-button-spinner" color={VARIANT_FG[variant]} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: VARIANT_FG[variant] }, isActive && styles.labelDisabled, error && variant === 'primary' && styles.labelError]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANT_STYLES: Record<Variant, object> = {
  primary: { backgroundColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  subtle: { backgroundColor: `${colors.primary}1A` },
};

const VARIANT_FG: Record<Variant, string> = {
  primary: colors.base,
  ghost: colors.primary,
  outline: colors.text,
  subtle: colors.primary,
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.8 },
  errorPrimary: { backgroundColor: colors.error },
  disabledBase: { opacity: 0.5 },
  label: { ...typography.label, textTransform: 'uppercase' },
  labelDisabled: { opacity: 0.6 },
  labelError: { color: colors.base },
});
