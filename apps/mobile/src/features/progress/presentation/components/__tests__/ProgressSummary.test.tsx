import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressSummary } from '../ProgressSummary';

const baseData = {
  readiness: { sleep: 420, hrv: 62, recovery: 78, score: 85 },
  todaySessions: [{ id: 's1', name: 'Fuerza', time: '08:00', endTime: '09:00', location: 'Gimnasio', status: 'completada' }],
  activeWorkouts: [
    { id: 'w1', contentName: 'Pierna', modality: 'fuerza', status: 'activo', progress: 0.6 },
    { id: 'w2', contentName: 'Cardio', modality: 'cardio', status: 'activo', progress: 0.9 },
  ],
};

describe('ProgressSummary', () => {
  it('renders a skeleton when loading — no fabricated numbers or labels', () => {
    const { queryByText } = render(<ProgressSummary data={undefined} loading />);
    // During loading, StatGrid shows skeleton blocks only; no metric labels appear.
    expect(queryByText('Readiness')).toBeNull();
    expect(queryByText('Sesiones')).toBeNull();
  });

  it('renders real readiness and session counts, never fabricated values', () => {
    const { getByText } = render(<ProgressSummary data={baseData} loading={false} />);
    expect(getByText('Sesiones')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('Readiness')).toBeTruthy();
    expect(getByText('85')).toBeTruthy();
  });

  it('renders an honest empty state when there are no active workouts', () => {
    const { getByText } = render(
      <ProgressSummary data={{ ...baseData, activeWorkouts: [] }} loading={false} />,
    );
    expect(getByText('Sin datos todavía')).toBeTruthy();
  });

  it('shows an em-dash when readiness has no score', () => {
    const { getByText } = render(
      <ProgressSummary
        data={{ ...baseData, readiness: { sleep: 0, hrv: 0, recovery: 0, score: null as unknown as number } }}
        loading={false}
      />,
    );
    expect(getByText('—')).toBeTruthy();
  });
});
