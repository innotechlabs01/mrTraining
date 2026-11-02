import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AGE_VALUES, RULER_ITEM_WIDTH } from './constants';
import { RulerPicker } from './RulerPicker';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.ageStep;
import { stepStyles } from './styles';
import { clampAge } from './utils';

type Props = {
  age: number;
  onAgeChange: (value: number) => void;
};

export function AgeStep({ age, onAgeChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Indica tu edad para adaptar la intensidad de tu plan de entrenamiento.
        </Text>
      </View>

      <View style={stepStyles.weightDisplayRow}>
        <Pressable
          onPress={() => onAgeChange(clampAge(age - 1))}
          style={stepStyles.weightArrowBtn}
          hitSlop={12}
        >
          <Text style={stepStyles.weightArrowText}>−</Text>
        </Pressable>
        <View style={stepStyles.weightValueBox}>
          <Text style={stepStyles.weightNumber}>{age}</Text>
          <Text style={stepStyles.weightUnitLabel}>{t.unitYears}</Text>
        </View>
        <Pressable
          onPress={() => onAgeChange(clampAge(age + 1))}
          style={stepStyles.weightArrowBtn}
          hitSlop={12}
        >
          <Text style={stepStyles.weightArrowText}>+</Text>
        </Pressable>
      </View>

      <RulerPicker
        values={AGE_VALUES}
        value={age}
        onChange={onAgeChange}
        itemWidth={RULER_ITEM_WIDTH}
      />
      <Text style={stepStyles.rulerHint}>{t.hint}</Text>
    </View>
  );
}
