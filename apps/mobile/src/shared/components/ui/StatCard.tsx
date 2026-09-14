import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { Skeleton } from './Skeleton';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  loading?: boolean;
};

/** Large-numeral stat tile — hero is the numeral, label underneath. */
export function StatCard({ label, value, unit, loading = false }: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Skeleton.Text lines={1} width="40%" height={14} />
        <Skeleton.Text lines={1} width="60%" height={32} />
      </View>
    );
  }

  const showValue = String(value);

  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {showValue}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minWidth: 120,
  },
  label: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    ...typography.metricLG,
    color: colors.text,
  },
  unit: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
