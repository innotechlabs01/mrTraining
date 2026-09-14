import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Props = TextInputProps & { error?: string; disabled?: boolean; loading?: boolean; selected?: boolean; empty?: boolean; };

export function Input({ error, disabled = false, loading = false, selected = false, empty = false, style, ...rest }: Props) {
  const [isFocused, setFocused] = useState(false);


  return (
    <View>
        <TextInput
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            error && styles.inputError,
            disabled && styles.inputDisabled,
            isFocused && styles.inputFocused,
            loading && styles.inputLoading,
            selected && styles.inputSelected,
            empty && styles.inputEmpty,
            style,
          ]}
          editable={!disabled && !loading}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  inputError: { borderColor: colors.error, borderWidth: 2 },
  inputDisabled: { backgroundColor: colors.surface, color: colors.textSecondary, borderColor: colors.border },
  inputFocused: { borderColor: colors.primary, borderWidth: 2 },
  inputLoading: { opacity: 0.6 },
  inputSelected: { backgroundColor: colors.surfaceRaised, borderColor: colors.primary },
  inputEmpty: { backgroundColor: colors.surface },
  error: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
});
