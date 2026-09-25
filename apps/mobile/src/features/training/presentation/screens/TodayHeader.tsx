/**
 * TodayHeader — greeting + date + quick actions for the athlete's landing.
 * 44pt touch targets, brand-neutral (primary reserved for the hero/CTA).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { SearchIcon, BellIcon, UserIcon } from '../../../../shared/components/icons';

type Props = {
  firstName: string;
  onSearch: () => void;
  onNotifications: () => void;
  onProfile: () => void;
};

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatToday(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function TodayHeader({ firstName, onSearch, onNotifications, onProfile }: Props) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerHi} numberOfLines={1}>
          Hola, <Text style={styles.headerName}>{firstName}</Text>
        </Text>
        <Text style={styles.headerDate}>{formatToday(new Date())}</Text>
      </View>
      <View style={styles.headerRight}>
        <Pressable
          accessibilityLabel="Buscar"
          accessibilityRole="button"
          onPress={onSearch}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <SearchIcon size={20} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Notificaciones"
          accessibilityRole="button"
          onPress={onNotifications}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <BellIcon size={20} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Perfil"
          accessibilityRole="button"
          onPress={onProfile}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <UserIcon size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerLeft: { flex: 1, gap: 2 },
  headerHi: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  headerName: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.primary,
  },
  headerDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2, fontSize: 12, textTransform: 'capitalize' as const },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: { opacity: 0.6 },
});