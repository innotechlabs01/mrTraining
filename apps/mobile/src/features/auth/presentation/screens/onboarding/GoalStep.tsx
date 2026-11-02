import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../../../../shared/theme/tokens';
import { GOALS } from '../../components/onboarding/options';
import { stepStyles } from './styles';

type Props = {
  goal: string;
  onGoalChange: (id: string) => void;
};

export function GoalStep({ goal, onGoalChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Elige el objetivo principal que guiará tu entrenamiento.
        </Text>
      </View>
      {GOALS.map((g) => {
        const active = goal === g.id;
        const GoalIcon = g.icon;
        return (
          <Pressable
            key={g.id}
            onPress={() => onGoalChange(g.id)}
            style={[styles.goalPill, active && styles.goalPillActive]}
          >
            <View style={styles.goalPillLeft}>
              <GoalIcon size={22} color={active ? colors.base : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalPillLabel, active && styles.goalPillLabelActive]}>
                  {g.label}
                </Text>
                <Text style={styles.goalPillDesc}>{g.desc}</Text>
              </View>
            </View>
            <View style={[styles.goalRadio, active && styles.goalRadioActive]}>
              {active ? <View style={styles.goalRadioInner} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Goal pills — Figma 4.5 style: white pill → MR surfaceRaised, radio on right, primary when selected
const styles = StyleSheet.create({
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    marginBottom: 10,
  },
  goalPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalPillLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  goalPillLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  goalPillLabelActive: { color: colors.base },
  goalPillDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 14 },
  goalRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalRadioActive: { borderColor: colors.base, backgroundColor: colors.base },
  goalRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
