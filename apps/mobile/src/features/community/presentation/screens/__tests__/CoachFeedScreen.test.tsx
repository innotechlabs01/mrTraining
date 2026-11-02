import React from 'react';
import { render } from '@testing-library/react-native';
import { CoachFeed } from '../CoachFeedScreen';

const mockItems = [
  {
    id: '1',
    coachName: 'Coach Martín',
    message: 'Buen trabajo en la sesión de hoy. Sigue así.',
    createdAt: '2026-09-08T14:30:00Z',
    type: 'feedback' as const,
  },
  {
    id: '2',
    coachName: 'Coach Martín',
    message: 'Mañana tenemos sesión grupal a las 8am.',
    createdAt: '2026-09-07T20:00:00Z',
    type: 'reminder' as const,
  },
];

test('renders title', () => {
  const { getByText } = render(<CoachFeed items={mockItems} />);
  expect(getByText('Feed del Coach')).toBeTruthy();
});

test('renders coach messages', () => {
  const { getByText } = render(<CoachFeed items={mockItems} />);
  expect(getByText('Buen trabajo en la sesión de hoy. Sigue así.')).toBeTruthy();
  expect(getByText('Mañana tenemos sesión grupal a las 8am.')).toBeTruthy();
});

test('renders coach names', () => {
  const { getAllByText } = render(<CoachFeed items={mockItems} />);
  expect(getAllByText('Coach Martín')).toHaveLength(2);
});

test('renders type badges', () => {
  const { getByText } = render(<CoachFeed items={mockItems} />);
  expect(getByText('Feedback')).toBeTruthy();
  expect(getByText('Recordatorio')).toBeTruthy();
});

test('shows empty state', () => {
  const { getByText } = render(<CoachFeed items={[]} />);
  expect(getByText('No hay publicaciones del coach')).toBeTruthy();
});

test('renders feed items with testID', () => {
  const { getAllByTestId } = render(<CoachFeed items={mockItems} />);
  expect(getAllByTestId('coach-feed-item')).toHaveLength(2);
});
