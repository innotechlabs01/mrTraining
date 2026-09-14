import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Tone = 'primary' | 'success' | 'warning' | 'error';
type Size = 'sm' | 'md' | 'lg';

const HEIGHT: Record<Size, number> = { sm: 4, md: 8, lg: 12 };
const TONE_FILL: Record<Tone, string> = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
};

type Props = {
  /** 0..1 */
  progress: number;
  tone?: Tone;
  size?: Size;
  /** Optional numeric label in Spanish, e.g. "42%" */
  showLabel?: boolean;
  /** Optional descriptive label, e.g. "Alta intensidad". */
  label?: string;
};

export function ProgressBar({ progress, tone = 'primary', size = 'sm', showLabel = false, label }: Props) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const pct = Math.round(clamped * 100);
  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        accessibilityLabel={label}
        style={[styles.track, { height: HEIGHT[size] }]}
      >
        <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: TONE_FILL[tone] }]} />
      </View>
      {showLabel ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.text}>{label}</Text> : null}
          <Text style={styles.text}>{pct}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: { borderRadius: radius.full, height: '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text: { ...typography.caption, color: colors.textSecondary },
});
