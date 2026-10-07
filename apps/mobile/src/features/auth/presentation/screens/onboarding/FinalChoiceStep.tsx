import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { CalendarIcon, CheckIcon, ChevronRightIcon } from '../../../../../shared/components/icons';
import { colors } from '../../../../../shared/theme/tokens';
import { stepStyles } from './styles';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.finalChoiceStep;

type Props = {
  onSchedule: () => void;
  onAccept: () => void;
};

export function FinalChoiceStep({ onSchedule, onAccept }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <Text style={stepStyles.sectionTitle}>
        We have created a routine based on your profile.
      </Text>
      <Text style={stepStyles.desc}>{t.desc}</Text>

      <Pressable
        onPress={onSchedule}
        style={[stepStyles.choiceCard, { borderColor: `${colors.primary}30` }]}
      >
        <View style={stepStyles.choiceIconBox}>
          <CalendarIcon size={24} color={colors.primary} />
        </View>
        <View style={stepStyles.choiceContent}>
          <Text style={stepStyles.choiceLabel}>{t.scheduleChoice}</Text>
          <Text style={stepStyles.choiceDesc}>
            Book a call to review and personalize your routine together
          </Text>
        </View>
        <ChevronRightIcon size={20} color={colors.primary} />
      </Pressable>

      <Pressable onPress={onAccept} style={stepStyles.choiceCard}>
        <View style={stepStyles.choiceIconBox}>
          <CheckIcon size={24} color={colors.primary} />
        </View>
        <View style={stepStyles.choiceContent}>
          <Text style={stepStyles.choiceLabel}>{t.systemRoutineChoice}</Text>
          <Text style={stepStyles.choiceDesc}>
            Start training immediately with the AI-generated plan
          </Text>
        </View>
        <ChevronRightIcon size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}
