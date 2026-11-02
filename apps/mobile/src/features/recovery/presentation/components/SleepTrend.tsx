import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';

/** Tiny bar trend — no chart dependency, real data only. */
export function SleepTrend({ nights }: { nights: Array<{ date: string; value: number }> }) {
  if (nights.length === 0) return null;
  const maxH = Math.max(8, ...nights.map(n => n.value));
  return (
    <View style={styles.trendRow}>
      {nights.slice(-7).map((night) => {
        const heightPct = Math.round((Math.min(night.value, maxH) / maxH) * 100);
        return (
          <View key={night.date} style={styles.trendCol}>
            <View style={styles.trendBarTrack}>
              <View style={[styles.trendBarFill, { height: `${heightPct}%` as `${number}%` }]} />
            </View>
            <Text style={styles.trendValue}>{night.value.toFixed(1)}</Text>
            <Text style={styles.trendDate}>{night.date.slice(8)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg },
  trendCol: { flex: 1, alignItems: 'center', gap: 2 },
  trendBarTrack: { height: 72, width: '100%', justifyContent: 'flex-end' },
  trendBarFill: { backgroundColor: colors.primary, borderRadius: 6, minHeight: 4 },
  trendValue: { ...typography.caption, color: colors.textSecondary },
  trendDate: { ...typography.caption, color: colors.textSecondary, opacity: 0.6 },
});
