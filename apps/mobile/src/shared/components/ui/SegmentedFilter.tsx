import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { Skeleton } from './Skeleton';

type Option = { key: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
  loading?: boolean;
};

/** Discrete segmented control — surfaceRaised track, selected segment on `surface`. */
export function SegmentedFilter({ options, value, onChange, loading = false }: Props) {
  if (loading) {
    return (
      <View style={styles.row}>
        {options.map((o) => (
          <Skeleton.Block key={o.key} height={40} radius={radius.sm} style={{ flex: 1 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => [styles.segment, selected && styles.segmentSelected, pressed && !selected && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentSelected: { backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  label: { ...typography.label, color: colors.textSecondary },
  labelSelected: { color: colors.text },
});
