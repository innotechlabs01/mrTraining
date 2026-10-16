import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { radius, spacing, typography } from '../../../../shared/theme/tokens';

const STATUS_THEME: Record<string, { bg: string; color: string; border: string }> = {
  active: { bg: '#34D3991A', color: '#34D399', border: '#34D39933' },
  grace_period: { bg: '#FBBF241A', color: '#FBBF24', border: '#FBBF2433' },
  suspended: { bg: '#FF6B6B1A', color: '#FF6B6B', border: '#FF6B6B33' },
  no_membership: { bg: '#9CA3AF1A', color: '#9CA3AF', border: '#9CA3AF33' },
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

function badgeStyle(theme: { bg: string; color: string; border: string }): ViewStyle {
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
