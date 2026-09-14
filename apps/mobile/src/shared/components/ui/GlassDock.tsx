import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontFamilies, radius, spacing, shadows } from '../../theme/tokens';
import {
  HomeIcon,
  BarbellIcon,
  CalendarIcon,
  HeartPulseIcon,
  UserIcon,
} from '../icons';
import { texts } from '../../i18n/texts';

const TAB_META: Record<string, { label: string; Icon: (p: { size: number; color: string }) => React.ReactElement }> = {
  Today: { label: texts.tabs.today, Icon: HomeIcon },
  Plan: { label: texts.tabs.plan, Icon: BarbellIcon },
  Events: { label: texts.tabs.events, Icon: CalendarIcon },
  Recovery: { label: texts.tabs.recovery, Icon: HeartPulseIcon },
  Profile: { label: texts.tabs.profile, Icon: UserIcon },
};

export function GlassDock({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, idx) => {
        const meta = TAB_META[route.name] ?? { label: route.name, Icon: HomeIcon };
        const isFocused = idx === state.index;
        const label = descriptors[route.key]?.options?.tabBarLabel ?? meta.label;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tab,
              !isFocused && pressed && styles.tabPressed,
              isFocused && styles.tabFocused,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={String(label)}
            hitSlop={8}
          >
            <meta.Icon size={22} color={isFocused ? colors.primary : colors.textSecondary} />
            <Text style={[styles.label, isFocused && styles.labelFocused]}>{String(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    // Frosted glass: semi-transparent base with subtle noise
    backgroundColor: 'rgba(11,15,14,0.82)',
    // Subtle top border glow for depth
    borderTopColor: 'rgba(200,255,0,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    // Frosted glass shadow layers
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    // Subtle active tab highlight
    borderRadius: radius.md,
  },
  tabPressed: { opacity: 0.7, backgroundColor: 'rgba(200,255,0,0.06)' },
  tabFocused: {
    backgroundColor: 'rgba(200,255,0,0.10)',
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  labelFocused: { color: colors.primary },
});