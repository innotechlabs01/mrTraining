import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { TrophyIcon } from '../icons';

type Props = {
  badgeName: string;
  visible: boolean;
  onDismiss: () => void;
};

const DISMISS_DELAY = 3000;
const SPRING_CONFIG = { damping: 12, stiffness: 120 };

export function BadgeUnlockToast({ badgeName, visible, onDismiss }: Props) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const handleAnimationEnd = () => {
    'worklet';
    runOnJS(onDismiss)();
  };

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withSpring(1, SPRING_CONFIG);

      const timeout = setTimeout(() => {
        translateY.value = withSpring(-100, SPRING_CONFIG);
        opacity.value = withDelay(150, withSpring(0, SPRING_CONFIG, handleAnimationEnd));
      }, DISMISS_DELAY);

      return () => clearTimeout(timeout);
    } else {
      translateY.value = -100;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      testID="badge-unlock-toast"
      style={[styles.container, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLabel={`Logro desbloqueado: ${badgeName}`}
    >
      <View style={styles.iconWrap}>
        <TrophyIcon size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>LOGRO DESBLOQUEADO</Text>
        <Text style={styles.badgeName} numberOfLines={1}>
          {badgeName}
        </Text>
      </View>
    </Animated.View>
  );
}

export function showBadgeUnlockToast(badgeName: string): {
  badgeName: string;
  visible: boolean;
} {
  return { badgeName, visible: true };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: radius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.label, color: colors.primary, fontSize: 10 },
  badgeName: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
});
