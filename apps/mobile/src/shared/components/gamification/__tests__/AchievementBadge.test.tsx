import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementBadge } from '../AchievementBadge';

test('renders unlocked achievement with title', () => {
  const { getByText } = render(
    <AchievementBadge title="Primera Semana" unlocked />
  );
  expect(getByText('Primera Semana')).toBeTruthy();
});

test('renders locked achievement with accessible label', () => {
  const { getByLabelText } = render(
    <AchievementBadge title="Mes Perfecto" unlocked={false} />
  );
  expect(getByLabelText('Logro bloqueado: Mes Perfecto')).toBeTruthy();
});

test('renders unlocked accessible label', () => {
  const { getByLabelText } = render(
    <AchievementBadge title="Centurión" unlocked />
  );
  expect(getByLabelText('Logro desbloqueado: Centurión')).toBeTruthy();
});

test('renders date when unlocked and unlockedAt provided', () => {
  const date = new Date(2026, 2, 15); // March 15, 2026 local time
  const { getByText } = render(
    <AchievementBadge title="Hit" unlocked unlockedAt={date} />
  );
  expect(getByText('15 mar')).toBeTruthy();
});

test('does not render date when locked', () => {
  const date = new Date(2026, 2, 15); // March 15, 2026 local time
  const { queryByText } = render(
    <AchievementBadge title="Hit" unlocked={false} unlockedAt={date} />
  );
  expect(queryByText('15 mar')).toBeNull();
});
