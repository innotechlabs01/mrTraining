import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckIcon } from '../../../../../shared/components/icons';
import { colors } from '../../../../../shared/theme/tokens';
import { EQUIPMENT_OPTIONS } from '../../components/onboarding/options';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.equipmentStep;
import { stepStyles } from './styles';

type Props = {
  equipment: string;
  onEquipmentChange: (id: string) => void;
};

export function EquipmentStep({ equipment, onEquipmentChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <Text style={stepStyles.sectionTitle}>{t.title}</Text>
      {EQUIPMENT_OPTIONS.map((e) => {
        const active = equipment === e.id;
        const EquipmentIcon = e.icon;
        return (
          <Pressable
            key={e.id}
            onPress={() => onEquipmentChange(e.id)}
            style={[stepStyles.choiceCard, active && stepStyles.choiceCardActive]}
          >
            <EquipmentIcon size={24} color={active ? colors.primary : colors.textSecondary} />
            <View style={stepStyles.choiceContent}>
              <Text style={[stepStyles.choiceLabel, active && stepStyles.choiceLabelActive]}>
                {e.label}
              </Text>
              <Text style={stepStyles.choiceDesc}>{e.desc}</Text>
            </View>
            {active ? (
              <View style={stepStyles.checkCircle}>
                <CheckIcon size={12} color={colors.base} />
              </View>
            ) : (
              <View style={stepStyles.checkCircleInactive} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
