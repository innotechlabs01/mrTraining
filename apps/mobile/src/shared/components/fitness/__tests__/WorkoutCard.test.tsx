import React from 'react';
import { render } from '@testing-library/react-native';
import { WorkoutCard } from '../WorkoutCard';

test('renders workout name', () => {
  const { getByText } = render(
    <WorkoutCard name="Push Day" difficulty="beginner" exerciseCount={5} durationMin={45} />
  );
  expect(getByText('Push Day')).toBeTruthy();
});

test('renders difficulty badge', () => {
  const { getByText } = render(
    <WorkoutCard name="Leg Day" difficulty="advanced" exerciseCount={8} durationMin={60} />
  );
  expect(getByText('Avanzado')).toBeTruthy();
});

test('renders exercise count singular', () => {
  const { getByText } = render(
    <WorkoutCard name="Warm Up" difficulty="beginner" exerciseCount={1} durationMin={10} />
  );
  expect(getByText('1 ejercicio')).toBeTruthy();
});

test('renders exercise count plural', () => {
  const { getByText } = render(
    <WorkoutCard name="Push Day" difficulty="intermediate" exerciseCount={5} durationMin={45} />
  );
  expect(getByText('5 ejercicios')).toBeTruthy();
});

test('renders duration', () => {
  const { getByText } = render(
    <WorkoutCard name="Cardio" difficulty="beginner" exerciseCount={3} durationMin={30} />
  );
  expect(getByText('30 min')).toBeTruthy();
});

test('renders intermediate difficulty', () => {
  const { getByText } = render(
    <WorkoutCard name="Pull Day" difficulty="intermediate" exerciseCount={6} durationMin={50} />
  );
  expect(getByText('Intermedio')).toBeTruthy();
});
