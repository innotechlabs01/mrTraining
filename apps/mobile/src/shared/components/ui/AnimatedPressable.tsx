/**
 * AnimatedPressable — Pressable with native-thread press feedback.
 *
 * The pressed state runs as a Reanimated worklet on the UI thread, so it never
 * re-renders React and never drops frames under load (rules 05-mobile-performance
 * §5). It is strictly additive: the caller's own `style` (static or the
 * `({ pressed }) => …` function form) is preserved, and the spring scale is
 * composed on top. That keeps existing pressed visuals intact.
 *
 * Press feedback contract: scale 0.97 (rules 01-mobile-ui-ux §3).
 * Motion is disabled when the OS asks to reduce motion (rule 06 §2, device states).
 */
import React, { memo, useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

/** Canonical pressed scale (rules 01-mobile-ui-ux §3). */
export const PRESS_SCALE = 0.97;

type PressState = { pressed: boolean };
type PressableStyle = StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);

type Props = Omit<PressableProps, 'style'> & {
  style?: PressableStyle;
  /** Scale applied while pressed. Defaults to PRESS_SCALE (0.97). */
  pressedScale?: number;
  children?: React.ReactNode;
};

export const AnimatedPressable = memo(function AnimatedPressable({
  style,
  pressedScale = PRESS_SCALE,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      scale.value = withSpring(pressedScale, { reduceMotion: ReduceMotion.System });
      onPressIn?.(event);
    },
    [scale, pressedScale, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.value = withSpring(1, { reduceMotion: ReduceMotion.System });
      onPressOut?.(event);
    },
    [scale, onPressOut],
  );

  const composedStyle = useCallback<PressableStyle>(
    (state) => [typeof style === 'function' ? style(state) : style, animatedStyle],
    [style, animatedStyle],
  );

  return (
    <AnimatedPressableBase
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={composedStyle as StyleProp<ViewStyle>}
    >
      {children}
    </AnimatedPressableBase>
  );
});
