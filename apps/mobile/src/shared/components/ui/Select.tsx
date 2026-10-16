
import { StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, radius } from '../../theme/tokens';

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  style?: any;
};

export function Select({ value, onValueChange, options, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={styles.picker}
        dropdownIconColor={colors.textSecondary}
      >
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  picker: {
    color: colors.text,
    height: 56,
  },
});
