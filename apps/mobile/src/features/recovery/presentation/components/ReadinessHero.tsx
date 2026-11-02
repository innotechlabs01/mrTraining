import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Badge } from '../../../../shared/components/ui/Badge';
import { texts } from '../../../../shared/i18n/texts';
import type { RecoveryState } from '../../hooks/useRecoveryData';
import { scoreColorOf } from './recoveryFormat';

const tr = texts.screens.recovery;

function readinessBadge(recovery: RecoveryState): { text: string; tone: 'success' | 'neutral' | 'warning' } {
  if (recovery.readinessScore == null) return { text: tr.badgeNoData, tone: 'warning' };
  return recovery.scoreSource === 'automatic'
    ? { text: tr.badgeAutomatic, tone: 'success' }
    : { text: tr.badgeManual, tone: 'neutral' };
}

export function ReadinessHero({ recovery }: { recovery: RecoveryState }) {
  const badge = readinessBadge(recovery);
  return (
    <View style={styles.scoreHero}>
      <View style={[styles.outerRing, { borderColor: `${scoreColorOf(recovery.readinessScore)}4D` }]}>
        <View style={[styles.innerCircle, { backgroundColor: scoreColorOf(recovery.readinessScore) }]}>
          <Text style={styles.scoreValue}>{recovery.readinessScore ?? '—'}</Text>
        </View>
      </View>
      <Badge text={badge.text} tone={badge.tone} />
      <Text style={styles.scoreHint}>
        {recovery.scoreSource === 'automatic'
          ? tr.scoreHintAutomatic
          : recovery.scoreSource === 'manual'
            ? tr.scoreHintManual
            : tr.scoreHintNoData}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreHero: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  outerRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  innerCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontFamily: typography.statsNumber.fontFamily, fontSize: 36, fontWeight: '800', color: colors.text, lineHeight: 36 },
  scoreHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
