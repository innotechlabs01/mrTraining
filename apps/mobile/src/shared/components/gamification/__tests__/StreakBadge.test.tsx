import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge } from '../StreakBadge';

test('renders streak count', () => {
  const { getByText, getByTestId } = render(<StreakBadge count={7} />);
  expect(getByTestId('streak-badge')).toBeTruthy();
  expect(getByText('7')).toBeTruthy();
});

test('has accessible label', () => {
  const { getByLabelText } = render(<StreakBadge count={14} />);
  expect(getByLabelText('Racha de 14 días')).toBeTruthy();
});

test('renders zero streak as inactive', () => {
  const { getByTestId } = render(<StreakBadge count={0} inactive />);
  const badge = getByTestId('streak-badge');
  expect(badge.props.accessibilityLabel).toBe('Racha de 0 días');
});
