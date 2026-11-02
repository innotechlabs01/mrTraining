import React from 'react';
import { View } from 'react-native';
import { OptionRow } from '../../components/onboarding/OptionRow';
import { SPORTS } from '../../components/onboarding/options';
import { stepStyles } from './styles';

type Props = {
  selected: string[];
  onToggle: (id: string) => void;
};

export function SportsStep({ selected, onToggle }: Props) {
  return (
    <View style={stepStyles.choicesInner}>
      {SPORTS.map((s) => (
        <OptionRow
          key={s.id}
          icon={s.icon}
          label={s.label}
          desc={s.desc}
          active={selected.includes(s.id)}
          onPress={() => onToggle(s.id)}
        />
      ))}
    </View>
  );
}
