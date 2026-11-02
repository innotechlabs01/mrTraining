/**
 * AnimatedPressable — Pressable with native-thread press feedback.
 *
 * The spring scale runs as a Reanimated worklet on the UI thread (rules
 * 05-mobile-performance §5). It is strictly additive: the caller's own `style`
 * (static or the `({ pressed }) => …` function form) is preserved and the scale
 * is composed on top, so existing pressed visuals stay intact.
 *
 * Reanimated's animated wrapper does not invoke function styles, so the
 * `pressed` flag is tracked here and the style is resolved to a plain array.
 * The flag is only tracked when the caller actually passes a function style.
 *
 * Press feedback contract: scale 0.97 (rules 01-mobile-ui-ux §3). Motion
 * follows the OS reduce-motion setting.
 */
import React, { memo, useCallback, useState } from 'react';
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
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const usesPressedState = typeof style === 'function';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      scale.value = withSpring(pressedScale, { reduceMotion: ReduceMotion.System });
      if (usesPressedState) setPressed(true);
      onPressIn?.(event);
    },
    [scale, pressedScale, usesPressedState, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.value = withSpring(1, { reduceMotion: ReduceMotion.System });
      if (usesPressedState) setPressed(false);
      onPressOut?.(event);
    },
    [scale, usesPressedState, onPressOut],
  );

  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressableBase
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[resolvedStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
});
