import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Card } from '../Card';
import { colors } from '../../../theme/tokens';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Today session</Text>
      </Card>,
    );
    expect(getByText('Today session')).toBeTruthy();
  });

  it('applies surface styles to a non-pressable card (host style must not be a function)', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>static</Text>
      </Card>,
    );
    const style = getByTestId('card').props.style;
    expect(typeof style).not.toBe('function');
    expect(StyleSheet.flatten(style)).toMatchObject({ backgroundColor: colors.surface });
  });

  it('keeps the caller style on a non-pressable card', () => {
    const { getByTestId } = render(
      <Card testID="card" style={{ marginTop: 7 }}>
        <Text>static</Text>
      </Card>,
    );
    expect(StyleSheet.flatten(getByTestId('card').props.style)).toMatchObject({ marginTop: 7 });
  });

  it('fires onPress on a pressable card', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Card onPress={onPress}>
        <Text>tap</Text>
      </Card>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress while loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Card onPress={onPress} loading>
        <Text>tap</Text>
      </Card>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
