import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  it('forwards typed text to onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Email" value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows an error message when provided', () => {
    const { getByText } = render(
      <Input placeholder="Email" value="" onChangeText={jest.fn()} error="Invalid email" />,
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });
});
