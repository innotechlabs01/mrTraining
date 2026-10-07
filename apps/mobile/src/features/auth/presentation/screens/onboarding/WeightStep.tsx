import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { RULER_ITEM_WIDTH, WEIGHT_VALUES } from './constants';
import { RulerPicker } from './RulerPicker';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.weightStep;
import { stepStyles } from './styles';
import { clampWeight } from './utils';

type Props = {
  weight: number;
  weightUnit: 'KG' | 'LB';
  onUnitChange: (unit: 'KG' | 'LB') => void;
  onWeightChange: (value: number) => void;
};

export function WeightStep({ weight, weightUnit, onUnitChange, onWeightChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Registra tu peso para personalizar tu plan.
        </Text>
      </View>

      <View style={stepStyles.unitToggleContainer}>
        <Pressable
          onPress={() => onUnitChange('KG')}
          style={[stepStyles.unitToggleBtn, weightUnit === 'KG' && stepStyles.unitToggleBtnActive]}
        >
          <Text
            style={[stepStyles.unitToggleText, weightUnit === 'KG' && stepStyles.unitToggleTextActive]}
          >
            KG
          </Text>
        </Pressable>
        <View style={stepStyles.unitToggleDivider} />
        <Pressable
          onPress={() => onUnitChange('LB')}
          style={[stepStyles.unitToggleBtn, weightUnit === 'LB' && stepStyles.unitToggleBtnActive]}
        >
          <Text
            style={[stepStyles.unitToggleText, weightUnit === 'LB' && stepStyles.unitToggleTextActive]}
          >
            LB
          </Text>
        </Pressable>
      </View>

      <View style={stepStyles.weightDisplayRow}>
        <Pressable
          onPress={() => onWeightChange(clampWeight(weight - 1))}
          style={stepStyles.weightArrowBtn}
          hitSlop={12}
        >
          <Text style={stepStyles.weightArrowText}>−</Text>
        </Pressable>

        <View style={stepStyles.weightValueBox}>
          <Text style={stepStyles.weightNumber}>{weight}</Text>
          <Text style={stepStyles.weightUnitLabel}>{weightUnit}</Text>
        </View>

        <Pressable
          onPress={() => onWeightChange(clampWeight(weight + 1))}
          style={stepStyles.weightArrowBtn}
          hitSlop={12}
        >
          <Text style={stepStyles.weightArrowText}>+</Text>
        </Pressable>
      </View>

      <RulerPicker
        values={WEIGHT_VALUES}
        value={weight}
        onChange={onWeightChange}
        itemWidth={RULER_ITEM_WIDTH}
      />
      <Text style={stepStyles.rulerHint}>{t.hint}</Text>
    </View>
  );
}
