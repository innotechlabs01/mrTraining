import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PrimaryButton } from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText, getByRole } = render(
      <PrimaryButton label="START WORKOUT" onPress={onPress} />,
    );
    expect(getByText('START WORKOUT')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PrimaryButton label="GO" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
