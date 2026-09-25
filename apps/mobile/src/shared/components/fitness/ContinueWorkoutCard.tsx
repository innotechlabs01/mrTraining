/**
 * ContinueWorkoutCard — dominant CTA of the athlete's Today screen.
 *
 * Training-first hero (Fitbod/NTC model): the next workout IS the primary
 * action. Shows live progress, meta, and an unmissable "Continuar" affordance.
 * No other card competes for attention above it.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, shadows, typography } from '../../theme/tokens';
import { DumbbellIcon, PlayIcon, ClockIcon } from '../icons';

type Props = {
  name: string;
  /** 0-1 fraction completed. */
  progress: number;
  exerciseCount: number;
  durationMin: number;
  onPress: () => void;
};

export function ContinueWorkoutCard({ name, progress, exerciseCount, durationMin, onPress }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continuar ${name}, ${pct} por ciento progreso, ${durationMin} minutos`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <DumbbellIcon size={22} color={colors.base} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.overline}>Entrenamiento de hoy</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.playBtn}>
          <PlayIcon size={22} color={colors.base} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <ClockIcon size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.metaText}>{durationMin} min</Text>
        </View>
        <Text style={styles.metaText}>
          {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
        </Text>
        <Text style={styles.metaText}>{pct}%</Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.cta}>
        Continuar <Text style={styles.ctaSub}>· reanudar donde quedaste</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.glow,
  },
  pressed: { opacity: 0.92 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.onPrimaryVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: { flex: 1, gap: 2 },
  overline: { ...typography.overline, color: colors.base, opacity: 0.7 },
  name: { ...typography.h3, color: colors.base },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: colors.base, fontWeight: '600' },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: `${colors.base}33`,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.base, borderRadius: radius.full },
  cta: { ...typography.label, color: colors.base },
  ctaSub: { ...typography.caption, fontWeight: '500', opacity: 0.6 },
});