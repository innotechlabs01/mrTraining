import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, withAlpha } from '../../../../shared/theme/tokens';

const BG_OPACITY = 0.1;
const BORDER_OPACITY = 0.2;

type StatusTheme = { bg: string; color: string; border: string };

function statusTheme(color: string): StatusTheme {
  return { bg: withAlpha(color, BG_OPACITY), color, border: withAlpha(color, BORDER_OPACITY) };
}

const STATUS_THEME: Record<string, StatusTheme> = {
  active: statusTheme(colors.success),
  grace_period: statusTheme(colors.warning),
  suspended: statusTheme(colors.error),
  no_membership: statusTheme(colors.textSecondary),
};

type Props = {
  status: string;
  label?: string;
};

export function MembershipStatusBadge({ status, label }: Props) {
  const theme = STATUS_THEME[status] ?? STATUS_THEME.no_membership;
  const text = label ?? status;
  const display = text.charAt(0).toUpperCase() + text.slice(1);

  return (
    <View style={badgeStyle(theme)}>
      <Text style={[styles.text, { color: theme.color }]}>{display}</Text>
    </View>
  );
}

function badgeStyle(theme: StatusTheme): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: theme.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  };
}

const styles = StyleSheet.create({
  text: { ...typography.caption, fontWeight: '600' },
});
