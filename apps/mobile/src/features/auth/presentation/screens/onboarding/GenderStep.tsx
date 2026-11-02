import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserIcon } from '../../../../../shared/components/icons';
import { colors } from '../../../../../shared/theme/tokens';
import { stepStyles } from './styles';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.genderStep;

type Gender = 'male' | 'female' | '';

type Props = {
  gender: Gender;
  onChange: (gender: Gender) => void;
};

export function GenderStep({ gender, onChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Elige la opción con la que te identificas. Esta información nos ayuda a personalizar tu
          plan.
        </Text>
      </View>

      <View style={styles.genderRow}>
        <Pressable
          onPress={() => onChange('male')}
          style={styles.genderItem}
          accessibilityRole="button"
          accessibilityLabel={t.maleA11y}
        >
          <View
            style={[
              styles.genderCircle,
              gender === 'male' ? styles.genderCircleSelected : styles.genderCircleUnselected,
            ]}
          >
            <UserIcon size={64} color={gender === 'male' ? colors.base : colors.text} />
          </View>
          <Text style={[styles.genderLabel, gender === 'male' && styles.genderLabelSelected]}>
            Masculino
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChange('female')}
          style={styles.genderItem}
          accessibilityRole="button"
          accessibilityLabel={t.femaleA11y}
        >
          <View
            style={[
              styles.genderCircle,
              gender === 'female' ? styles.genderCircleSelected : styles.genderCircleUnselected,
            ]}
          >
            <UserIcon size={64} color={gender === 'female' ? colors.base : colors.text} />
          </View>
          <Text style={[styles.genderLabel, gender === 'female' && styles.genderLabelSelected]}>
            Femenino
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Two 140px circles, MR palette (lime → primary, gray → surfaceRaised)
const styles = StyleSheet.create({
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 24,
    paddingVertical: 12,
  },
  genderItem: { alignItems: 'center', gap: 12 },
  genderCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  genderCircleUnselected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  genderCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderLabel: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  genderLabelSelected: { color: colors.primary },
});
