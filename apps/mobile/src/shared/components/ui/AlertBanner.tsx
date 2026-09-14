import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { AlertIcon, InfoIcon, CheckIcon, WarningIcon } from '../icons';

type Tone = 'success' | 'warning' | 'error' | 'info';

type Props = {
  tone: Tone;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const TONE_THEME: Record<Tone, { icon: React.ReactElement; color: string }> = {
  success: { icon: <CheckIcon size={16} color={colors.success} />, color: colors.success },
  warning: { icon: <WarningIcon size={16} color={colors.warning} />, color: colors.warning },
  error: { icon: <AlertIcon size={16} color={colors.error} />, color: colors.error },
  info: { icon: <InfoIcon size={16} color={colors.info} />, color: colors.info },
};

/** Structured, icon-paired status banner — color is reinforcement, never the sole channel. */
export function AlertBanner({ tone, title, message, actionLabel, onAction }: Props) {
  const { icon, color } = TONE_THEME[tone];
  return (
    <View style={[styles.banner, { borderLeftColor: color }]} accessibilityRole="alert">
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={[styles.actionText, { color }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconWrap: { paddingTop: 1 },
  body: { flex: 1, gap: 2 },
  title: { ...typography.bodyStrong, color: colors.text, fontSize: 14 },
  message: { ...typography.caption, color: colors.textSecondary },
  action: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: spacing.xs },
  actionText: { ...typography.label, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
});
