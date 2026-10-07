import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, typography, fontFamilies } from '../../../../shared/theme/tokens';
import { texts } from '../../../../shared/i18n/texts';

type Props = {
  onPress: () => void;
};

export function CreateWorkoutCard({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.createCard, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.createIcon}>{'+'}</Text>
      <View style={styles.createLeft}>
        <Text style={styles.createTitle}>{texts.screens.createWorkoutCard.title}</Text>
        <Text style={styles.createSub}>{texts.screens.createWorkoutCard.subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: spacing.md,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    textAlign: 'center',
    lineHeight: 44,
    fontSize: 22,
    fontWeight: '700',
    color: colors.base,
    overflow: 'hidden',
  },
  createLeft: { flex: 1, gap: 2 },
  createTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14 },
  createSub: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
});
