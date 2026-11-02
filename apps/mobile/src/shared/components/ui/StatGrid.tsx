import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme/tokens';
import { MetricCard } from './MetricCard';
import { Skeleton } from './Skeleton';

type Metric = {
  label: string;
  value: string | number | null;
  unit?: string;
  tone?: 'text' | 'success' | 'warning' | 'error';
  size?: 'md' | 'lg' | 'xl';
  trend?: { delta: 'up' | 'down' | 'flat'; label?: string };
};

type Props = {
  metrics: Metric[];
  cols?: number;
  loading?: boolean;
  empty?: boolean;
  emptyPlaceholder?: React.ReactNode;
};

/** Equal-height grid of MetricCards. Loading → skeleton grid; empty → placeholder. */
export function StatGrid({ metrics, cols = 2, loading = false, emptyPlaceholder }: Props) {
  if (loading) {
    return (
      <View style={styles.grid}>
        {Array.from({ length: cols }).map((_, i) => (
          <View key={i} style={{ flex: 1 }}>
            <Skeleton.Block height={112} radius={16} />
          </View>
        ))}
      </View>
    );
  }

  if (metrics.length === 0 && emptyPlaceholder) {
    return <>{emptyPlaceholder}</>;
  }

  return (
    <View style={styles.grid}>
      {metrics.map((m, i) => (
        <View key={i} style={styles.cell}>
          <MetricCard
            label={m.label}
            value={m.value}
            unit={m.unit}
            tone={m.tone}
            size={m.size}
            trend={m.trend}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flexGrow: 1, flexBasis: 140 },
});
