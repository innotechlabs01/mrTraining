import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { spacing } from '../../../../../shared/theme/tokens';
import { RULER_ITEM_WIDTH } from './constants';
import { stepStyles } from './styles';

type Props = {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  itemWidth?: number;
  formatLabel?: (value: number) => string;
  isMajor?: (value: number) => boolean;
  isSelected?: (value: number, current: number) => boolean;
};

/**
 * Horizontal ruler picker shared by the weight, age and height steps.
 * Renders the triangle indicator, center line and a snapping ScrollView.
 * Keeps itself centered on the current value on mount and on every change.
 */
export function RulerPicker({
  values,
  value,
  onChange,
  itemWidth = RULER_ITEM_WIDTH,
  formatLabel = String,
  isMajor,
  isSelected,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const rulerRef = useRef<ScrollView>(null);
  const padding = Math.round(screenW / 2 - itemWidth / 2 - spacing.lg);
  const firstValue = values[0] ?? 0;

  const major = isMajor ?? ((v: number) => v % 5 === 0);
  const selected = isSelected ?? ((a: number, b: number) => a === b);

  // Keep the ruler centered on the current value
  useEffect(() => {
    if (rulerRef.current) {
      const x = Math.max(0, (value - firstValue) * itemWidth);
      const timer = setTimeout(() => rulerRef.current?.scrollTo({ x, animated: true }), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [value, firstValue, itemWidth]);

  return (
    <>
      <View style={stepStyles.rulerIndicatorWrap}>
        <View style={stepStyles.rulerTriangle} />
      </View>
      <View style={stepStyles.rulerBar}>
        <View style={stepStyles.rulerCenterLine} />
        <ScrollView
          ref={rulerRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: padding }}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const idx = Math.round(x / itemWidth);
            const clampedIdx = Math.min(values.length - 1, Math.max(0, idx));
            const next = values[clampedIdx];
            if (next !== undefined && next !== value) onChange(next);
          }}
        >
          {values.map((v) => {
            const isSel = selected(v, value);
            const isMaj = major(v);
            return (
              <Pressable key={v} onPress={() => onChange(v)} style={stepStyles.rulerItem}>
                <Text
                  style={[
                    stepStyles.rulerNumber,
                    isSel ? stepStyles.rulerNumberSelected : stepStyles.rulerNumberUnselected,
                    isMaj && !isSel ? stepStyles.rulerNumberMajor : null,
                  ]}
                >
                  {formatLabel(v)}
                </Text>
                <View
                  style={[
                    stepStyles.rulerTick,
                    isMaj ? stepStyles.rulerTickMajor : stepStyles.rulerTickMinor,
                    isSel && stepStyles.rulerTickSelected,
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}
