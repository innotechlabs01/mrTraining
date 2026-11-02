import React from 'react';
import { render } from '@testing-library/react-native';
import { Leaderboard } from '../Leaderboard';

const mockEntries = [
  { userId: '1', name: 'Ana', points: 150 },
  { userId: '2', name: 'Carlos', points: 120 },
  { userId: '3', name: 'María', points: 90 },
];

test('renders title', () => {
  const { getByText } = render(<Leaderboard entries={mockEntries} />);
  expect(getByText('Leaderboard del Grupo')).toBeTruthy();
});

test('renders custom title', () => {
  const { getByText } = render(
    <Leaderboard entries={mockEntries} title="Mi Ranking" />
  );
  expect(getByText('Mi Ranking')).toBeTruthy();
});

test('renders entries sorted by points descending', () => {
  const { getAllByTestId } = render(<Leaderboard entries={mockEntries} />);
  const rows = getAllByTestId('leaderboard-row');
  expect(rows).toHaveLength(3);
});

test('highlights current user', () => {
  const { getByText } = render(
    <Leaderboard entries={mockEntries} currentUserId="2" />
  );
  const carlos = getByText('Carlos');
  expect(carlos).toBeTruthy();
});

test('shows empty state', () => {
  const { getByText } = render(<Leaderboard entries={[]} />);
  expect(getByText('Sin datos de leaderboard')).toBeTruthy();
});

test('has accessible labels', () => {
  const { getByLabelText } = render(<Leaderboard entries={mockEntries} />);
  expect(getByLabelText('Puesto 1: Ana, 150 puntos')).toBeTruthy();
  expect(getByLabelText('Puesto 2: Carlos, 120 puntos')).toBeTruthy();
  expect(getByLabelText('Puesto 3: María, 90 puntos')).toBeTruthy();
});
