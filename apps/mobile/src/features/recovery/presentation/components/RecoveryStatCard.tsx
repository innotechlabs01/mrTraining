import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../../../shared/theme/tokens';

type Props = {
  value: string;
  label: string;
  detail?: string | undefined;
};

export function RecoveryStatCard({ value, label, detail }: Props) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.primary, lineHeight: 28 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.textSecondary, textTransform: 'uppercase' },
  statDetail: { fontSize: 11, fontWeight: '400', color: colors.textSecondary, marginTop: spacing.xs },
});
