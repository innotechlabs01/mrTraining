import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../../../shared/theme/tokens';
import { CheckIcon } from '../../../../../shared/components/icons';
import type { OptionIcon } from './options';

type Props = {
  icon: OptionIcon;
  label: string;
  desc?: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * Reusable single-select / multi-select choice row used across Onboarding
 * (sports, modality, level, equipment). Leading icon, label + description,
 * trailing check when selected.
 */
export function OptionRow({ icon: Icon, label, desc, active, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, active && styles.iconBoxActive]}>
        <Icon size={22} color={active ? colors.primary : colors.textSecondary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}
      </View>
      <View style={[styles.check, active ? styles.checkActive : styles.checkInactive]}>
        {active ? <CheckIcon size={14} color={colors.base} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    minHeight: spacing.lg * 2 + spacing.md,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}14`,
  },
  pressed: { opacity: 0.85 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: `${colors.primary}1F` },
  content: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  labelActive: { color: colors.primary },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.primary },
  checkInactive: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
});
