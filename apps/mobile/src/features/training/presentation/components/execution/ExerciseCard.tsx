import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../../shared/theme/tokens';
import { InfoIcon, PlayIcon } from '../../../../../shared/components/icons';
import type { ScoredQuality } from '../../../../ai/application/FormEngine';
import { FormVerdictBadge } from './FormVerdictBadge';

type Props = {
  name: string;
  detail: string;
  /** Prescription rationale; hidden when null. */
  whyText: string | null;
  progressText: string;
  /** Demo video entry point; rendered only when a demo video exists. */
  onViewDemo?: () => void;
  viewDemoLabel?: string;
  /** Latest AI form-check verdict for this exercise; hidden when absent. */
  verdict?: { quality: ScoredQuality; score: number } | null;
};

/** Current exercise block: name, prescription detail, rationale, set progress. */
export function ExerciseCard({
  name,
  detail,
  whyText,
  progressText,
  onViewDemo,
  viewDemoLabel,
  verdict,
}: Props) {
  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        {onViewDemo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={viewDemoLabel}
            onPress={onViewDemo}
            style={styles.demoButton}
            hitSlop={8}
          >
            <PlayIcon size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.detail}>{detail}</Text>
      {whyText ? (
        <View style={styles.whyRow}>
          <InfoIcon size={14} color={colors.primary} />
          <Text style={styles.whyText}>{whyText}</Text>
        </View>
      ) : null}
      {verdict ? <FormVerdictBadge quality={verdict.quality} score={verdict.score} /> : null}
      <Text style={styles.progress}>{progressText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  demoButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.display, color: colors.text, flex: 1 },
  detail: { ...typography.body, color: colors.textSecondary },
  whyText: { ...typography.caption, color: colors.primary },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  progress: { ...typography.caption, color: colors.primary },
});
