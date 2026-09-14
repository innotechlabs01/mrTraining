import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    const { getByText } = render(<StatCard label="WORKOUTS" value={12} />);
    expect(getByText('WORKOUTS')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
  });

  it('renders unit when provided', () => {
    const { getByText } = render(<StatCard label="WEIGHT" value={85} unit="kg" />);
    expect(getByText('kg')).toBeTruthy();
  });

  it('does not render unit when omitted', () => {
    const { queryByText } = render(<StatCard label="STREAK" value={7} />);
    expect(queryByText(/kg/)).toBeNull();
  });

  it('renders string value', () => {
    const { getByText } = render(<StatCard label="STATUS" value="Active" />);
    expect(getByText('Active')).toBeTruthy();
  });
});
