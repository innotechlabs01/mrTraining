import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { SearchIcon, BellIcon, ArrowLeftIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

type Props = {
  onBack: () => void;
  onSearch: () => void;
  onNotifications: () => void;
};

export function WorkoutListHeader({ onBack, onSearch, onNotifications }: Props) {
  return (
    <View style={styles.headerRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={texts.common.back}
        onPress={onBack}
        hitSlop={12}
        style={styles.backButton}
      >
        <ArrowLeftIcon size={24} color={colors.primary} />
      </Pressable>
      <Text style={styles.headerTitle}>{texts.screens.workoutListHeader.title}</Text>
      <View style={styles.headerRight}>
        <Pressable accessibilityLabel={texts.common.search} onPress={onSearch} style={styles.iconButton}>
          <SearchIcon size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityLabel={texts.common.notifications} onPress={onNotifications} style={styles.iconButton}>
          <BellIcon size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.primary,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
