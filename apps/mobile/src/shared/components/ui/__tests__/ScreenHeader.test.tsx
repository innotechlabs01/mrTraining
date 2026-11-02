import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScreenHeader } from '../ScreenHeader';

describe('ScreenHeader', () => {
  it('renders title and optional subtitle', () => {
    const { getByText } = render(<ScreenHeader title="Events" subtitle="This month" />);
    expect(getByText('Events')).toBeTruthy();
    expect(getByText('This month')).toBeTruthy();
  });

  it('calls onBack when back control is pressed', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(<ScreenHeader title="Detail" onBack={onBack} />);
    fireEvent.press(getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
