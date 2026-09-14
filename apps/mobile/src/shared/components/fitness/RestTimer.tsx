import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFamilies } from '../../theme/tokens';

type Props = {
  duration: number; // seconds
  onComplete: () => void;
  size?: number;
};

export function RestTimer({ duration, onComplete, size = 160 }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const progress = remaining / duration;

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth * 2) / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${colors.primary}20`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={2 * Math.PI * radius}
          strokeDashoffset={2 * Math.PI * radius * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.time}>{display}</Text>
      <Text style={styles.label}>REST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    position: 'absolute',
    fontFamily: fontFamilies.displayBlack,
    fontSize: 44,
    color: colors.text,
  },
  label: {
    position: 'absolute',
    bottom: '30%',
    fontFamily: fontFamilies.heading,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
});
