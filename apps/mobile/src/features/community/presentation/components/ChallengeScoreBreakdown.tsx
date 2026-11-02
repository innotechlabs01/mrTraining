import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { CheckIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';
import type { ChallengeAttempt } from './challengeTypes';

type Props = {
  attempt: ChallengeAttempt;
};

/** Score breakdown card for the athlete's most recent completed attempt. */
export function ChallengeScoreBreakdown({ attempt }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeader title={texts.challenge.scoreBreakdown} icon={<CheckIcon size={18} color={colors.success} />} />
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{texts.challenge.formScore}</Text>
          <Text style={styles.statValue}>{attempt.form_score?.toFixed(1) ?? '-'}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Profundidad</Text>
          <Text style={styles.statValue}>{attempt.depth_score?.toFixed(1) ?? '-'}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Alineacion</Text>
          <Text style={styles.statValue}>{attempt.alignment_score?.toFixed(1) ?? '-'}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tempo</Text>
          <Text style={styles.statValue}>{attempt.tempo_score?.toFixed(1) ?? '-'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
