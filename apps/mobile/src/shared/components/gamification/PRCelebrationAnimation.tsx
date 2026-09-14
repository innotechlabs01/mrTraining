import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated/lib/typescript/commonTypes';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  visible: boolean;
  onComplete?: () => void;
};

const PARTICLE_COUNT = 10;
const ANIMATION_DURATION = 1500;

function getParticleConfigs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i * 360) / count + Math.random() * 30,
    distance: 60 + Math.random() * 40,
    size: 4 + Math.random() * 4,
    delay: Math.random() * 200,
  }));
}

const PARTICLES = getParticleConfigs(PARTICLE_COUNT);

export function PRCelebrationAnimation({ visible, onComplete }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withTiming(
        1,
        { duration: ANIMATION_DURATION, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && onComplete) {
            onComplete();
          }
        },
      );
    } else {
      progress.value = 0;
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((particle) => (
        <Particle
          key={particle.id}
          progress={progress}
          angle={particle.angle}
          distance={particle.distance}
          size={particle.size}
          delay={particle.delay}
        />
      ))}
    </View>
  );
}

type ParticleProps = {
  progress: SharedValue<number>;
  angle: number;
  distance: number;
  size: number;
  delay: number;
};

function Particle({ progress, angle, distance, size, delay }: ParticleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const delayedProgress = withDelay(delay, progress.value);
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance * delayedProgress;
    const y = Math.sin(rad) * distance * delayedProgress - 20 * delayedProgress;
    const opacity = interpolate(delayedProgress, [0, 0.3, 1], [0, 1, 0], 'clamp');
    const scale = interpolate(delayedProgress, [0, 0.2, 1], [0.5, 1.2, 0.3], 'clamp');

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  particle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: colors.primary,
  },
});
