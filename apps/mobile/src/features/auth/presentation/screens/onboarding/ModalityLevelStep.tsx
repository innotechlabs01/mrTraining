import React from 'react';
import { Text, View } from 'react-native';
import { spacing } from '../../../../../shared/theme/tokens';
import { OptionRow } from '../../components/onboarding/OptionRow';
import { LEVELS, MODALITIES } from '../../components/onboarding/options';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.modalityLevelStep;
import { stepStyles } from './styles';

type Props = {
  modality: string;
  level: string;
  onModalityChange: (id: string) => void;
  onLevelChange: (id: string) => void;
};

export function ModalityLevelStep({ modality, level, onModalityChange, onLevelChange }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      <Text style={stepStyles.sectionTitle}>{t.title}</Text>
      {MODALITIES.map((m) => (
        <OptionRow
          key={m.id}
          icon={m.icon}
          label={m.label}
          desc={m.desc}
          active={modality === m.id}
          onPress={() => onModalityChange(m.id)}
        />
      ))}
      <Text style={[stepStyles.sectionTitle, { marginTop: spacing.lg }]}>
        Tu nivel de experiencia
      </Text>
      {LEVELS.map((l) => (
        <OptionRow
          key={l.id}
          icon={l.icon}
          label={l.label}
          desc={l.desc}
          active={level === l.id}
          onPress={() => onLevelChange(l.id)}
        />
      ))}
    </View>
  );
}
