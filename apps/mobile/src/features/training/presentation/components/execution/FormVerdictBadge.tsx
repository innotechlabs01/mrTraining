import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../../shared/theme/tokens';
import { texts } from '../../../../../shared/i18n/texts';
import type { ScoredQuality } from '../../../../ai/application/FormEngine';

type Props = {
  quality: ScoredQuality;
  score: number;
};

/** Small chip shown in execution after an AI form-check: verdict + 0-100 score. */
export function FormVerdictBadge({ quality, score }: Props) {
  const t = texts.screens.aiWorkout;
  const label =
    quality === 'GOOD' ? t.verdictGood : quality === 'REGULAR' ? t.verdictRegular : t.verdictBad;
  const tone =
    quality === 'GOOD' ? colors.success : quality === 'REGULAR' ? colors.warning : colors.error;
  return (
    <View
      style={[styles.chip, { borderColor: tone }]}
      accessibilityRole="text"
      accessibilityLabel={`${t.formScoreLabel}: ${label}, ${score}`}
    >
      <Text style={[styles.label, { color: tone }]}>{label}</Text>
      <Text style={styles.score}>
        {t.formScoreLabel} {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 28,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: { ...typography.label },
  score: { ...typography.caption, color: colors.textSecondary },
});
