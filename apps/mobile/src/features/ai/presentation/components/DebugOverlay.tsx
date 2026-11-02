import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import type { DebugInfo } from '../hooks/useAiWorkout';

interface Props {
  info: DebugInfo;
  visible: boolean;
}

function num(label: string, value: number, unit = ''): string {
  const v = Number.isFinite(value) ? value.toFixed(value < 10 ? 1 : 0) : '—';
  return `${label}: ${v}${unit}`;
}

export function DebugOverlay({ info, visible }: Props): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <View pointerEvents="none" accessibilityRole="summary" accessibilityLabel="Debug overlay" style={styles.root}>
      <Text style={styles.text}>{num('FPS', info.fps)} · {num('AI', info.aiFps)} · {num('latency', info.inferenceLatencyMs, 'ms')}</Text>
      <Text style={styles.text}>cpu: — · gpu: — · ram: —</Text>
      <Text style={styles.text}>{num('battery', info.battery, '%')} · temp: {info.temperature}</Text>
      <Text style={styles.text}>model: {info.model} · v{info.modelVersion}</Text>
      <Text style={styles.text}>{num('landmarks', info.landmarks)} · {num('conf', info.confidence)}</Text>
      <Text style={styles.text}>{num('dist', info.spread)} · framing: {info.framing}</Text>
      <Text style={styles.text}>exercise: {info.exercise}</Text>
      <Text style={styles.text}>phase: {info.phase}</Text>
      <Text style={styles.text}>{num('ROM', info.rom, '°')} · {num('vel', info.velocity, '°/s')} · {num('tempo', info.tempo, 'ms')}</Text>
      <Text style={styles.text}>{num('reps', info.reps)} · quality: {info.repQuality}</Text>
      <Text style={styles.text}>{num('form', info.form)} · {num('failure', info.failure)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(11, 15, 14, 0.85)',
    borderRadius: 6,
  },
  text: {
    color: colors.onSurfaceVariant,
    ...typography.bodySmall,
    fontVariant: ['tabular-nums'],
  },
});