import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../../../../shared/theme/tokens';
import { LEVELS } from '../../components/onboarding/options';
import { stepStyles } from './styles';

type Props = {
  activityLevel: string;
  onActivityLevelChange: (id: string) => void;
};

export function ActivityStep({ activityLevel, onActivityLevelChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Selecciona tu nivel de actividad física habitual.
        </Text>
      </View>
      {LEVELS.map((l) => {
        const active = activityLevel === l.id;
        const LevelIcon = l.icon;
        return (
          <Pressable
            key={l.id}
            onPress={() => onActivityLevelChange(l.id)}
            style={[styles.activityPill, active && styles.activityPillActive]}
          >
            <LevelIcon size={22} color={active ? colors.base : colors.primary} />
            <Text style={[styles.activityPillLabel, active && styles.activityPillTextActive]}>
              {l.label}
            </Text>
            <Text style={[styles.activityPillDesc, active && styles.activityPillDescActive]}>
              {l.desc}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Activity pills — Figma 4.6 style: 3 centered pills, white → primary when selected
const styles = StyleSheet.create({
  activityPill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    marginBottom: 12,
  },
  activityPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activityPillLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  activityPillTextActive: { color: colors.base },
  activityPillDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  activityPillDescActive: { color: `${colors.base}CC` },
});
