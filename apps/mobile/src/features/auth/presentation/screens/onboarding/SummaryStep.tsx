import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TargetIcon } from '../../../../../shared/components/icons';
import { colors, radius, spacing } from '../../../../../shared/theme/tokens';
import {
  EQUIPMENT_OPTIONS,
  GOALS,
  LEVELS,
  MODALITIES,
  SPORTS,
  type OptionIcon,
} from '../../components/onboarding/options';
import { stepStyles } from './styles';
import type { OnboardingData } from './types';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.summaryStep;

type Props = {
  data: OnboardingData;
};

/**
 * Renders a summary row value with a leading option icon (replaces inline emoji).
 */
function SummaryOption({ option }: { option: { label: string; icon: OptionIcon } | undefined }) {
  if (!option) {
    return <Text style={styles.summaryVal}>—</Text>;
  }
  const Icon = option.icon;
  return (
    <View style={styles.summaryValRow}>
      <Icon size={14} color={colors.textSecondary} />
      <Text style={styles.summaryVal}>{option.label}</Text>
    </View>
  );
}

export function SummaryStep({ data }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <View style={styles.summaryHero}>
        <View style={{ marginBottom: 12 }}>
          <TargetIcon size={48} color={colors.primary} />
        </View>
        <Text style={styles.summaryTitle}>{t.title}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.sports}</Text>
          <View style={styles.summaryChips}>
            {data.sports.map((s) => {
              const sport = SPORTS.find((x) => x.id === s);
              const SportIcon = sport?.icon;
              return (
                <View key={s} style={styles.miniChip}>
                  {SportIcon ? <SportIcon size={14} color={colors.primary} /> : null}
                  <Text style={styles.miniChipText}>{sport?.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.modality}</Text>
          <SummaryOption option={MODALITIES.find((m) => m.id === data.modality)} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.level}</Text>
          <SummaryOption option={LEVELS.find((l) => l.id === data.experienceLevel)} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.gender}</Text>
          <Text style={styles.summaryVal}>
            {data.gender ? (data.gender === 'male' ? t.male : t.female) : '—'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.weight}</Text>
          <Text style={styles.summaryVal}>
            {data.weight} {data.weightUnit}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Age</Text>
          <Text style={styles.summaryVal}>{data.age} yrs</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.height}</Text>
          <Text style={styles.summaryVal}>
            {data.heightUnit === 'CM' ? `${data.height} CM` : `${(data.height ?? 0).toFixed(1)} FT`}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Goal</Text>
          <SummaryOption option={GOALS.find((g) => g.id === data.goal)} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.activity}</Text>
          <SummaryOption option={LEVELS.find((l) => l.id === data.activityLevel)} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.schedule}</Text>
          <Text style={styles.summaryVal}>
            {data.sessionsPerWeek}x/week · {data.sessionDuration} min
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.equipment}</Text>
          <SummaryOption option={EQUIPMENT_OPTIONS.find((e) => e.id === data.equipment)} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>{t.profile}</Text>
          <Text style={styles.summaryVal} numberOfLines={2}>
            {[data.firstName, data.lastName].filter(Boolean).join(' ') || '—'}
            {data.email ? ` · ${data.email}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryHero: { alignItems: 'center', marginBottom: 20 },
  summaryTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  summaryCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  summaryDivider: { height: 1, backgroundColor: colors.border },
  summaryKey: { fontSize: 14, color: colors.textSecondary, fontWeight: '600', width: 90 },
  summaryVal: { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  summaryValRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  summaryChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${colors.primary}14`,
  },
  miniChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});
