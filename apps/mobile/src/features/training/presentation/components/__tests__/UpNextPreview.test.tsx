import React from 'react';
import { render } from '@testing-library/react-native';
import { UpNextPreview } from '../UpNextPreview';

describe('UpNextPreview', () => {
  const exercises = [
    { name: 'Sentadilla', sets: 4, reps: 8, weightKg: 80 },
    { name: 'Press de banca', sets: 3, reps: 10, weightKg: 60 },
    { name: 'Remo', sets: 3, reps: 12, weightKg: 50 },
  ];

  it('renders upcoming exercises', () => {
    const { getByText } = render(<UpNextPreview exercises={exercises} />);
    expect(getByText('SIGUIENTE')).toBeTruthy();
    expect(getByText('Sentadilla')).toBeTruthy();
    expect(getByText('Press de banca')).toBeTruthy();
  });

  it('renders exercise details', () => {
    const { getByText } = render(<UpNextPreview exercises={exercises} />);
    expect(getByText('4 x 8 @ 80 kg')).toBeTruthy();
    expect(getByText('3 x 10 @ 60 kg')).toBeTruthy();
  });

  it('respects maxItems', () => {
    const { getByText, queryByText } = render(
      <UpNextPreview exercises={exercises} maxItems={1} />,
    );
    expect(getByText('Sentadilla')).toBeTruthy();
    expect(queryByText('Press de banca')).toBeNull();
  });

  it('renders nothing when no exercises', () => {
    const { toJSON } = render(<UpNextPreview exercises={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders time mode exercises', () => {
    const timeExercises = [
      { name: 'Plancha', sets: 3, reps: 0, weightKg: null, mode: 'time' as const, sec: 45 },
    ];
    const { getByText } = render(<UpNextPreview exercises={timeExercises} />);
    expect(getByText('3 x 45s')).toBeTruthy();
  });
});
