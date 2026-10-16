
/**
 * TodayHeader — greeting, localized date and quick actions
 * for the athlete's landing screen.
 *
 * Design principles:
 * - Brand-neutral header; primary color reserved for emphasis.
 * - Minimum 44x44 pt touch targets.
 * - Responsive greeting for narrow screens and long names.
 * - Accessible actions with reusable button styling.
 * - No additional dependencies.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  fontFamilies,
  radius,
  spacing,
  typography,
} from '../../../../shared/theme/tokens';

import {
  SearchIcon,
  BellIcon,
  UserIcon,
} from '../../../../shared/components/icons';

import { texts } from '../../../../shared/i18n/texts';

type TodayHeaderProps = {
  firstName: string;
  greeting?: string;
  locale?: string;
  onSearch: () => void;
  onNotifications: () => void;
  onProfile: () => void;
};

type HeaderActionProps = {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
};

/**
 * Formats the current date using the selected locale.
 * Example: "Miércoles, 15 oct"
 */
function formatToday(
  date: Date,
  locale: string = 'es-CO',
): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date);

  return (
    formatted.charAt(0).toLocaleUpperCase(locale) +
    formatted.slice(1)
  );
}

/**
 * Reusable accessible action button.
 */
function HeaderAction({
  label,
  onPress,
  icon,
}: HeaderActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.iconButtonPressed,
      ]}
    >
      {icon}
    </Pressable>
  );
}

/**
 * Athlete landing header.
 */
export function TodayHeader({
  firstName,
  greeting,
  locale = 'es-CO',
  onSearch,
  onNotifications,
  onProfile,
}: TodayHeaderProps) {
  const displayName = firstName.trim();

  const greetingText =
    greeting ?? texts.screens.todayHeader.greeting;

  const today = formatToday(new Date(), locale);

  return (
    <View style={styles.headerRow}>
      {/* Greeting and date */}
      <View style={styles.headerLeft}>
        <Text
          style={styles.greeting}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          accessibilityRole="header"
        >
          {greetingText}
          {displayName ? ' ' : ''}
          {displayName ? (
            <Text style={styles.headerName}>
              {displayName}
            </Text>
          ) : null}
        </Text>

        <Text
          style={styles.headerDate}
          numberOfLines={1}
          accessibilityLabel={today}
        >
          {today}
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.headerActions}>
        <HeaderAction
          label={texts.common.search}
          onPress={onSearch}
          icon={
            <SearchIcon
              size={20}
              color={colors.textSecondary}
            />
          }
        />

        <HeaderAction
          label={texts.common.notifications}
          onPress={onNotifications}
          icon={
            <BellIcon
              size={20}
              color={colors.textSecondary}
            />
          }
        />

        <HeaderAction
          label={texts.tabs.profile}
          onPress={onProfile}
          icon={
            <UserIcon
              size={20}
              color={colors.textSecondary}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },

  headerLeft: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },

  greeting: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 27,
    lineHeight: 33,
    color: colors.text,
    letterSpacing: -0.6,
  },

  headerName: {
    fontFamily: fontFamilies.displayBold,
    color: colors.primary,
  },

  headerDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

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

  iconButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
});
