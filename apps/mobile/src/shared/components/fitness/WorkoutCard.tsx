import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { Badge } from '../ui/Badge';
import { DumbbellIcon, ClockIcon } from '../icons';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type Props = {
  name: string;
  difficulty: Difficulty;
  exerciseCount: number;
  durationMin: number;
  onPress?: () => void;
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const DIFFICULTY_TONE: Record<Difficulty, 'success' | 'warning' | 'error'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
};

export function WorkoutCard({ name, difficulty, exerciseCount, durationMin, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${DIFFICULTY_LABEL[difficulty]}, ${exerciseCount} ejercicios, ${durationMin} minutos`}
    >
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Badge text={DIFFICULTY_LABEL[difficulty]} tone={DIFFICULTY_TONE[difficulty]} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <DumbbellIcon size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <ClockIcon size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{durationMin} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
