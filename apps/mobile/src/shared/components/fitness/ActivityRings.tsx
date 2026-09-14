import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  move: number;
  exercise: number;
  recovery: number;
  size?: number;
};

const MOVE_COLOR = '#C8FF00';
const EXERCISE_COLOR = '#34D399';
const RECOVERY_COLOR = '#3B9EFF';

export function ActivityRings({ move, exercise, recovery, size = 200 }: Props) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth * 2) / 2;

  const rings = [
    { progress: Math.min(1, Math.max(0, move)), color: MOVE_COLOR, r: radius },
    { progress: Math.min(1, Math.max(0, exercise)), color: EXERCISE_COLOR, r: radius - strokeWidth * 2.5 },
    { progress: Math.min(1, Math.max(0, recovery)), color: RECOVERY_COLOR, r: radius - strokeWidth * 5 },
  ];

  return (
    <View testID="activity-rings" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map(({ progress, color, r }, i) => (
          <React.Fragment key={i}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={`${color}20`}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={2 * Math.PI * r}
              strokeDashoffset={2 * Math.PI * r * (1 - progress)}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
