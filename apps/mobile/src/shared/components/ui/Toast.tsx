import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import Toast from 'react-native-toast-message';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { CheckIcon, AlertIcon, InfoIcon, WarningIcon, TrophyIcon } from '../icons';

// ---------------------------------------------------------------------------
// Theme-matched toasts (SVG icons — no emoji glyphs)
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'badge';

const THEME: Record<ToastType, { icon: React.ReactElement; color: string }> = {
  success: { icon: <CheckIcon size={18} color={colors.success} />, color: colors.success },
  error: { icon: <AlertIcon size={18} color={colors.error} />, color: colors.error },
  info: { icon: <InfoIcon size={18} color={colors.info} />, color: colors.info },
  warning: { icon: <WarningIcon size={18} color={colors.warning} />, color: colors.warning },
  badge: { icon: <TrophyIcon size={18} color={colors.primary} />, color: colors.primary },
};

function ToastRenderer({ text1, text2, type }: ToastConfigParams<any>) {
  const { icon, color } = THEME[(type as ToastType) ?? 'info'];
  return (
    <View style={[styles.toast, { borderLeftColor: color }]} accessibilityRole="alert">
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>{icon}</View>
      <View style={styles.body}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 64,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  message: { ...typography.body, fontSize: 13, color: colors.textSecondary },
});

export const toastConfig: ToastConfig = {
  success: (props) => <ToastRenderer {...props} />,
  error: (props) => <ToastRenderer {...props} />,
  info: (props) => <ToastRenderer {...props} />,
  warning: (props) => <ToastRenderer {...props} />,
};

// ---------------------------------------------------------------------------
// Imperative helper — unified API for the app
// ---------------------------------------------------------------------------

export function showToast(type: ToastType, title: string, message?: string) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
  });
}

// Re-export imperative Toast for provider rendering.
export { Toast };
export default Toast;
