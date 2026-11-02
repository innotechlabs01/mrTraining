import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AnimatedPressable, PRESS_SCALE } from '../AnimatedPressable';

describe('AnimatedPressable', () => {
  it('exposes the canonical pressed scale from the UI/UX rules', () => {
    expect(PRESS_SCALE).toBe(0.97);
  });

  it('renders its children', () => {
    const { getByText } = render(
      <AnimatedPressable testID="tap" onPress={() => {}}>
        <Text>TAP ME</Text>
      </AnimatedPressable>,
    );
    expect(getByText('TAP ME')).toBeTruthy();
  });

  it('runs press feedback and fires onPress once', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AnimatedPressable testID="tap" accessibilityRole="button" onPress={onPress}>
        <Text>TAP ME</Text>
      </AnimatedPressable>,
    );
    const target = getByTestId('tap');
    fireEvent(target, 'pressIn');
    fireEvent.press(target);
    fireEvent(target, 'pressOut');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AnimatedPressable testID="tap" onPress={onPress} disabled>
        <Text>TAP ME</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByTestId('tap'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('preserves a function style and passes the pressed state through', () => {
    const styleFn = jest.fn(() => ({ opacity: 0.7 }));
    const { getByTestId } = render(
      <AnimatedPressable testID="tap" style={styleFn}>
        <Text>TAP ME</Text>
      </AnimatedPressable>,
    );
    expect(getByTestId('tap')).toBeTruthy();
    expect(styleFn).toHaveBeenCalled();
    expect(styleFn.mock.calls[0][0]).toHaveProperty('pressed');
  });

  it('flips the pressed flag on pressIn and resets it on pressOut', () => {
    const seen: boolean[] = [];
    const styleFn = ({ pressed }: { pressed: boolean }) => {
      seen.push(pressed);
      return { opacity: pressed ? 0.7 : 1 };
    };
    const { getByTestId } = render(
      <AnimatedPressable testID="tap" style={styleFn}>
        <Text>TAP ME</Text>
      </AnimatedPressable>,
    );
    fireEvent(getByTestId('tap'), 'pressIn');
    expect(seen[seen.length - 1]).toBe(true);
    fireEvent(getByTestId('tap'), 'pressOut');
    expect(seen[seen.length - 1]).toBe(false);
  });
});
