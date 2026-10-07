/**
 * OfflineBanner — slim top banner shown when the device is definitely offline.
 *
 * NetInfo reports `isConnected: null` until the first state resolves, so null is
 * treated as "unknown" and the banner stays hidden — this avoids a flash on boot.
 * Mounted once at the app root (src/navigation/App.tsx), floating above content.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme/tokens';
import { texts } from '../../i18n/texts';
import { shouldShowOfflineBanner } from './offlineBannerVisibility';

export { shouldShowOfflineBanner };

const ANIMATION_MS = 200;
/** Enough to park the banner fully above the status bar. */
const HIDDEN_OFFSET = 120;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const translateY = useSharedValue(-HIDDEN_OFFSET);

  useEffect(() => {
    NetInfo.fetch()
      .then((state) => setIsConnected(state.isConnected))
      .catch(() => {});
    return NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
  }, []);

  const visible = shouldShowOfflineBanner(isConnected);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -HIDDEN_OFFSET, { duration: ANIMATION_MS });
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      testID="offline-banner"
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }, animatedStyle]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityElementsHidden={!visible}
    >
      <Text style={styles.text}>{texts.common.offline}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1100,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.error,
  },
  text: {
    ...typography.label,
    fontSize: 11,
    color: colors.text,
  },
});
