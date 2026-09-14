import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DayStrip, type CalendarDay } from '../DayStrip';

const days: CalendarDay[] = [
  { key: '2024-02-14', weekday: 'Wed', dayNumber: 14, month: 'Feb', eventCount: 2, isToday: true },
  { key: '2024-02-15', weekday: 'Thu', dayNumber: 15, month: 'Feb', eventCount: 0, isToday: false },
  { key: '2024-02-16', weekday: 'Fri', dayNumber: 16, month: 'Feb', eventCount: 1, isToday: false },
];

describe('DayStrip', () => {
  it('renders every day with number and event count', () => {
    const { getByText } = render(
      <DayStrip days={days} selectedKey="2024-02-14" onSelect={jest.fn()} onEndReached={jest.fn()} />,
    );
    expect(getByText('Hoy')).toBeTruthy();
    expect(getByText('14')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('Thu')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('calls onSelect with the tapped day', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <DayStrip days={days} selectedKey="2024-02-14" onSelect={onSelect} onEndReached={jest.fn()} />,
    );
    fireEvent.press(getByText('16'));
    expect(onSelect).toHaveBeenCalledWith('2024-02-16');
  });
});