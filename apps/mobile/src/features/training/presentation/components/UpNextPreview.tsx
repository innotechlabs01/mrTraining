/**
 * UpNextPreview — shows upcoming exercises during workout execution.
 * Helps athletes prepare for what's next with a compact card design.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { ChevronRightIcon } from '../../../../shared/components/icons';

export type UpNextExercise = {
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  mode?: 'reps' | 'time' | 'cardio';
  sec?: number | null;
};

export type UpNextPreviewProps = {
  exercises: UpNextExercise[];
  maxItems?: number;
};

function ExerciseRow({ exercise, index }: { exercise: UpNextExercise; index: number }) {
  const isTimeMode = exercise.mode === 'time';
  const isCardioMode = exercise.mode === 'cardio';

  const detail = isTimeMode
    ? `${exercise.sets} x ${exercise.sec ?? 0}s`
    : isCardioMode
      ? `${exercise.sets} x ${exercise.reps} reps`
      : [
          `${exercise.sets} x ${exercise.reps}`,
          exercise.weightKg != null && exercise.weightKg > 0
            ? `@ ${exercise.weightKg} kg`
            : null,
        ]
          .filter(Boolean)
          .join(' ');

  return (
    <View style={styles.exerciseRow}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.exerciseDetail}>{detail}</Text>
      </View>
      <ChevronRightIcon size={16} color={colors.textSecondary} />
    </View>
  );
}

export function UpNextPreview({ exercises, maxItems = 2 }: UpNextPreviewProps) {
  const upcoming = exercises.slice(0, maxItems);

  if (upcoming.length === 0) return null;

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>SIGUIENTE</Text>
      {upcoming.map((exercise, i) => (
        <ExerciseRow key={`${exercise.name}-${i}`} exercise={exercise} index={i} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  exerciseDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
