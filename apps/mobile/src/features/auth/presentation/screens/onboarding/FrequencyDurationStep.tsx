import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../../../shared/theme/tokens';
import { DURATIONS, FREQUENCIES } from '../../components/onboarding/options';
import { stepStyles } from './styles';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.frequencyDurationStep;

type Props = {
  frequency: number;
  duration: number;
  onFrequencyChange: (value: number) => void;
  onDurationChange: (value: number) => void;
};

export function FrequencyDurationStep({
  frequency,
  duration,
  onFrequencyChange,
  onDurationChange,
}: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <Text style={stepStyles.sectionTitle}>{t.daysTitle}</Text>
      <View style={styles.chipRow}>
        {FREQUENCIES.map((f) => {
          const active = frequency === f;
          return (
            <Pressable
              key={f}
              onPress={() => onFrequencyChange(f)}
              style={[styles.freqChip, active && styles.freqChipActive]}
            >
              <Text style={[styles.freqText, active && styles.freqTextActive]}>{f}</Text>
              <Text style={[styles.freqSub, active && styles.freqSubActive]}>{t.daysUnit}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.freqBar}>
        {FREQUENCIES.map((f) => (
          <View key={f} style={[styles.freqBarDot, frequency >= f && styles.freqBarDotActive]} />
        ))}
      </View>

      <Text style={[stepStyles.sectionTitle, { marginTop: 32 }]}>{t.durationTitle}</Text>
      <View style={styles.chipRow}>
        {DURATIONS.map((d) => {
          const active = duration === d;
          return (
            <Pressable
              key={d}
              onPress={() => onDurationChange(d)}
              style={[styles.durChip, active && styles.durChipActive]}
            >
              <Text style={[styles.durText, active && styles.durTextActive]}>{d}</Text>
              <Text style={[styles.durSub, active && styles.durSubActive]}>{t.minutesUnit}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Chips — frequency / duration
const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  freqChip: {
    width: 52,
    height: 72,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freqChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  freqText: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
  freqTextActive: { color: colors.primary },
  freqSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  freqSubActive: { color: colors.primary },
  freqBar: { flexDirection: 'row', gap: 7, marginTop: 16, paddingHorizontal: 2 },
  freqBarDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  freqBarDotActive: { backgroundColor: colors.primary },
  durChip: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  durText: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
  durTextActive: { color: colors.primary },
  durSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  durSubActive: { color: colors.primary },
});
