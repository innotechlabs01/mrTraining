import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { texts } from '../../../../shared/i18n/texts';
import type { ChallengeAttempt } from './challengeTypes';

type Props = {
  /** Completed attempts only; newest first. */
  attempts: ChallengeAttempt[];
};

/** Attempt history (up to 5) with an empty state when none exist. */
export function ChallengeAttemptsList({ attempts }: Props) {
  if (attempts.length === 0) {
    return (
      <View style={styles.section}>
        <EmptyState
          variant="empty"
          title={texts.challenge.noAttempts}
          message={texts.screens.challengeAttemptsList.empty}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={`${texts.challenge.attempts} (${attempts.length})`} />
      {attempts.slice(0, 5).map((a) => (
        <View key={a.id} style={styles.attemptCard}>
          <View style={styles.attemptHeader}>
            <Text style={styles.attemptTitle}>
              {texts.challenge.attemptN.replace('{n}', String(a.attempt_number))}
            </Text>
            <Text style={styles.attemptDate}>
              {new Date(a.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.attemptScores}>
            <Text style={styles.attemptScore}>Forma: {a.form_score?.toFixed(1) ?? '-'}</Text>
            <Text style={styles.attemptScore}>Prof: {a.depth_score?.toFixed(1) ?? '-'}</Text>
            {a.total_volume != null && (
              <Text style={styles.attemptScore}>Vol: {a.total_volume.toFixed(0)}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  attemptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attemptTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  attemptDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  attemptScores: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  attemptScore: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
