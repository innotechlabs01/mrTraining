import React from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { TrendUpIcon, TrendDownIcon } from '../icons';

type Tone = 'text' | 'success' | 'warning' | 'error';

type Trend = {
  delta: 'up' | 'down' | 'flat';
  label?: string;
};

type Props = {
  label: string;
  value: string | number | null;
  unit?: string;
  tone?: Tone;
  size?: 'md' | 'lg' | 'xl';
  trend?: Trend;
  loading?: boolean;
};

const TONE_COLOR: Record<Tone, string> = {
  text: colors.text,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
};

/** Big-number display unit — the hero is the numeral, not the label. */
export function MetricCard({ label, value, unit, tone = 'text', size = 'md', trend, loading = false }: Props) {
  const metricStyle = (size === 'xl' ? typography.metricXL : size === 'lg' ? typography.metricLG : typography.metricMD) as unknown as TextStyle;
  const color = TONE_COLOR[tone];

  if (loading) {
    return (
      <Card>
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
        </View>
        <Skeleton.Text lines={1} width="50%" height={26} />
      </Card>
    );
  }

  const trendColor = trend?.delta === 'up' ? colors.success : trend?.delta === 'down' ? colors.error : colors.textSecondary;
  const TrendIcon = trend?.delta === 'up' ? TrendUpIcon : trend?.delta === 'down' ? TrendDownIcon : null;
  const showValue = value != null ? String(value) : '—';

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {trend ? (
          <View style={styles.trend}>
            {TrendIcon ? <TrendIcon size={12} color={trendColor} /> : null}
            <Text style={[styles.trendText, { color: trendColor }]}>{trend.label}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <Text style={[metricStyle, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {showValue}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { ...typography.overline, color: colors.textSecondary },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { ...typography.caption, color: colors.textSecondary },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  unit: { ...typography.bodySmall, color: colors.textSecondary },
});
