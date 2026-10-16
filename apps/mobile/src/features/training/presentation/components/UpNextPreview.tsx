/**
 * UpNextPreview — shows upcoming exercises during workout execution.
 * Helps athletes prepare for what's next with a compact card design.
 */
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { ChevronRightIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

export type UpNextExercise = {
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  mode?: 'reps' | 'time' | 'cardio' | undefined;
  sec?: number | null | undefined;
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
      ? `${exercise.sets} x ${exercise.reps} ${texts.screens.upNextPreview.repsUnit}`
      : [
          `${exercise.sets} x ${exercise.reps}`,
          exercise.weightKg != null && exercise.weightKg > 0
            ? `@ ${exercise.weightKg} kg`
            : null,
        ]
          .filter(Boolean)
          .join(' ');

  return (
    <Pressable
      style={({ pressed }) => [styles.exerciseRow, pressed && styles.pressed]}
    >
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
    </Pressable>
  );
}

export function UpNextPreview({ exercises, maxItems = 2 }: UpNextPreviewProps) {
  const upcoming = exercises.slice(0, maxItems);

  if (upcoming.length === 0) return null;

  return (
    <Card variant="premium" style={styles.container}>
      <Text style={styles.title}>{texts.screens.upNextPreview.title}</Text>
      {upcoming.map((exercise, i) => (
        <ExerciseRow key={`${exercise.name}-${i}`} exercise={exercise} index={i} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...typography.bodyStrong,
    color: colors.primary,
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
  pressed: { opacity: 0.7 },
});
