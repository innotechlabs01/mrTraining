import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PlanInfoCard,
  UpcomingWorkoutsSection,
  UpcomingSessionsSection,
  type UpcomingWorkoutItem,
  type TrainingSession,
} from '../PlanInfoSections';

const upcoming: UpcomingWorkoutItem[] = [
  { id: 'w1', contentName: 'Full Body Fuerza', status: 'active', nextDate: '2026-09-18' },
  { id: 'w2', contentName: 'Cardio Intervalos', status: 'active', nextDate: '2026-09-20' },
];

const sessions: TrainingSession[] = [
  { id: 's1', title: 'Sesión Grupal', scheduledAt: '2026-09-19T08:00:00Z', endAt: '2026-09-19T09:00:00Z', location: 'Sala A', status: 'scheduled' },
];

describe('PlanInfoCard', () => {
  it('renders assigned, completed and weekly days', () => {
    const { getByText } = render(
      <PlanInfoCard plan={{ assigned: 3, completed: 1, days: [1, 3, 5] }} loading={false} onEmpty={false} />,
    );
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Lun · Mié · Vie')).toBeTruthy();
  });

  it('hides days row when no days', () => {
    const { queryByText } = render(
      <PlanInfoCard plan={{ assigned: 2, completed: 0, days: [] }} loading={false} onEmpty={false} />,
    );
    expect(queryByText('Días de la semana')).toBeNull();
  });

  it('shows empty state without assigned plan', () => {
    const { getByText } = render(
      <PlanInfoCard plan={{ assigned: 0, completed: 0, days: [] }} loading={false} onEmpty={true} />,
    );
    expect(getByText('Sin plan asignado')).toBeTruthy();
  });
});

describe('UpcomingWorkoutsSection', () => {
  it('labels tomorrow first and renders later date', () => {
    const { getByText } = render(
      <UpcomingWorkoutsSection items={upcoming} loading={false} tomorrowStr="2026-09-18" onOpen={jest.fn()} />,
    );
    expect(getByText('Full Body Fuerza')).toBeTruthy();
    expect(getByText('Mañana')).toBeTruthy();
    expect(getByText('Cardio Intervalos')).toBeTruthy();
    expect(getByText('20 Sep')).toBeTruthy();
  });

  it('fires onOpen on press', () => {
    const onOpen = jest.fn();
    const { getByText } = render(
      <UpcomingWorkoutsSection items={[upcoming[0]]} loading={false} tomorrowStr="2026-09-18" onOpen={onOpen} />,
    );
    fireEvent.press(getByText('Full Body Fuerza'));
    expect(onOpen).toHaveBeenCalledWith('w1');
  });

  it('shows empty state without upcoming workouts', () => {
    const { getByText } = render(
      <UpcomingWorkoutsSection items={[]} loading={false} tomorrowStr="2026-09-18" onOpen={jest.fn()} />,
    );
    expect(getByText('Sin entrenamientos próximos')).toBeTruthy();
  });
});

describe('UpcomingSessionsSection', () => {
  it('renders title, time range and location', () => {
    const { getByText } = render(<UpcomingSessionsSection items={sessions} loading={false} onOpen={jest.fn()} />);
    expect(getByText('Sesión Grupal')).toBeTruthy();
    expect(getByText(/—/)).toBeTruthy();
    expect(getByText(/Sala A/)).toBeTruthy();
  });

  it('shows empty state without sessions', () => {
    const { getByText } = render(<UpcomingSessionsSection items={[]} loading={false} onOpen={jest.fn()} />);
    expect(getByText('Sin sesiones próximas')).toBeTruthy();
  });
});