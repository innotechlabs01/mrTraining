import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Input } from '../../../../shared/components/ui/Input';
import {
  isMultiKind,
  isSingleKind,
  optionsOf,
  type FormField,
} from './eventDetailTypes';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventRegistrationForm;

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export type RegistrationAnswers = Record<string, string | string[]>;

type Props = {
  fields: FormField[];
  answers: RegistrationAnswers;
  onSetSingle: (fieldId: string, value: string) => void;
  onToggleMulti: (fieldId: string, value: string) => void;
  onSetText: (fieldId: string, value: string) => void;
};

/** Registration form card rendering single-choice, multi-choice, and text/number fields. */
export function EventRegistrationForm({
  fields,
  answers,
  onSetSingle,
  onToggleMulti,
  onSetText,
}: Props) {
  const renderField = (field: FormField) => {
    const value = answers[field.id];
    if (isSingleKind(field.kind)) {
      return (
        <View style={styles.chipRow}>
          {optionsOf(field).map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={value === opt}
              onPress={() => onSetSingle(field.id, opt)}
            />
          ))}
        </View>
      );
    }
    if (isMultiKind(field.kind)) {
      const selected = Array.isArray(value) ? value : [];
      return (
        <View style={styles.chipRow}>
          {optionsOf(field).map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={selected.includes(opt)}
              onPress={() => onToggleMulti(field.id, opt)}
            />
          ))}
        </View>
      );
    }
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChangeText={(t) => onSetText(field.id, t)}
        placeholder={field.kind === 'number' ? t.numberLabel : t.answerPlaceholder}
        keyboardType={field.kind === 'number' ? 'numeric' : 'default'}
        accessibilityLabel={field.label}
      />
    );
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>{t.title}</Text>
      {fields.map((field) => (
        <View key={field.id} style={styles.field}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          {renderField(field)}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.primary },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  chipLabelSelected: { color: colors.base },
});
