import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../../../shared/theme/tokens';
import type { CameraPositionStatus } from '../../domain/RepTypes';

interface Props {
  status: CameraPositionStatus;
}

const colorFor = (status: CameraPositionStatus): string => {
  if (status === 'POSITION_VALID') return colors.primary;
  if (status === 'POSITION_ADJUSTING') return '#F5C451';
  return '#E5484D';
};

export function FramingOverlay({ status }: Props): React.JSX.Element {
  const color = colorFor(status);
  return (
    <View
      pointerEvents="none"
      accessibilityRole="summary"
      accessibilityLabel={`Framing ${status.toLowerCase().replace('position_', '')}`}
      style={styles.container}
    >
      <View style={[styles.frame, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '72%',
    aspectRatio: 3 / 4,
    borderWidth: 3,
    borderRadius: radius.lg,
    margin: spacing.lg,
  },
});