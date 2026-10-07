import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../../../shared/theme/tokens';
import { Input } from '../../../../../shared/components/ui/Input';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** When true (e.g. RIR), the field uses a fixed 84pt column instead of filling the row. */
  fixedWidth?: boolean;
};

/** Numeric input row used for set metrics (seconds, RIR). */
export function SetInput({ value, onChangeText, placeholder, fixedWidth }: Props) {
  return (
    <View style={styles.row}>
      <View style={fixedWidth ? styles.fixedCol : styles.fillCol}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType="numeric"
          inputMode="numeric"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  fillCol: { flex: 1 },
  fixedCol: { width: 84 },
});
