import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, skeleton as skeletonTokens, spacing } from '../../theme/tokens';

type BlockProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
};

function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Base rounded skeleton block with a pulsing shimmer. Static when reduced-motion. */
export function SkeletonBlock({ width = '100%', height = 16, radius: r = skeletonTokens.radius, style }: BlockProps) {
  return <View style={[{ width, height, borderRadius: r, backgroundColor: colors.skeletonBase }, style]} />;
}

function ShimmerGroup({ children }: { children: React.ReactNode }) {
  const reduced = useReduceMotion();
  const opacity = useMemo(() => new Animated.Value(0.4), []);
  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: skeletonTokens.duration / 2, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.4, duration: skeletonTokens.duration / 2, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);
  return <Animated.View style={{ opacity, gap: spacing.sm }}>{children}</Animated.View>;
}

export const Skeleton = {
  Block: SkeletonBlock,
  Text: function Text({ width = '100%', lines = 3, height = 12 }: { width?: number | `${number}%`; lines?: number; height?: number }) {
    return (
      <ShimmerGroup>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock key={i} width={width} height={height} />
        ))}
      </ShimmerGroup>
    );
  },
  Circle: function Circle({ size = 40 }: { size?: number }) {
    return <SkeletonBlock width={size} height={size} radius={size / 2} />;
  },
  List: function List({ rows = 4, height = 72 }: { rows?: number; height?: number }) {
    return (
      <ShimmerGroup>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={[styles.row, { height }]}>
            <SkeletonBlock width={40} height={40} radius={radius.md} />
            <View style={styles.rowBody}>
              <SkeletonBlock width="55%" height={14} />
              <SkeletonBlock width="80%" height={10} />
            </View>
          </View>
        ))}
      </ShimmerGroup>
    );
  },
  Grid: function Grid({ cols = 2, height = 120 }: { cols?: number; height?: number }) {
    return (
      <ShimmerGroup>
        <View style={styles.gridRow}>
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonBlock key={i} height={height} radius={radius.lg} style={{ flex: 1 }} />
          ))}
        </View>
      </ShimmerGroup>
    );
  },
  DayStrip: function DayStripSkeleton({ count = 6 }: { count?: number }) {
    return (
      <ShimmerGroup>
        <View style={styles.dayRow}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonBlock key={i} width={60} height={78} radius={radius.md} />
          ))}
        </View>
      </ShimmerGroup>
    );
  },
  Screen: function ScreenSkeleton() {
    return (
      <ShimmerGroup>
        <SkeletonBlock width="45%" height={26} />
        <SkeletonBlock width="70%" height={12} />
        <Skeleton.Grid cols={2} height={120} />
        <Skeleton.List rows={3} height={64} />
      </ShimmerGroup>
    );
  },
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1, gap: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  dayRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
});
