import {
  evaluateAttempt,
  updatePRs,
  formatPRValue,
  countTotalPRs,
  PersonalRecord,
} from '../domain/prService';

test('first attempt is always a PR', () => {
  const comparison = evaluateAttempt(
    { exerciseId: 'bench', exerciseName: 'Bench Press', value: 80, unit: 'kg', attemptedAt: '2026-01-01' },
    [],
  );
  expect(comparison.isNewPR).toBe(true);
  expect(comparison.previousBest).toBeNull();
  expect(comparison.newBest).toBe(80);
});

test('lower attempt is not a PR', () => {
  const existing: PersonalRecord[] = [
    { exerciseId: 'bench', exerciseName: 'Bench Press', bestValue: 100, unit: 'kg', achievedAt: '2025-12-01' },
  ];
  const comparison = evaluateAttempt(
    { exerciseId: 'bench', exerciseName: 'Bench Press', value: 90, unit: 'kg', attemptedAt: '2026-01-01' },
    existing,
  );
  expect(comparison.isNewPR).toBe(false);
  expect(comparison.newBest).toBe(100);
});

test('higher attempt is a PR with improvement', () => {
  const existing: PersonalRecord[] = [
    { exerciseId: 'bench', exerciseName: 'Bench Press', bestValue: 80, unit: 'kg', achievedAt: '2025-12-01' },
  ];
  const comparison = evaluateAttempt(
    { exerciseId: 'bench', exerciseName: 'Bench Press', value: 90, unit: 'kg', attemptedAt: '2026-01-01' },
    existing,
  );
  expect(comparison.isNewPR).toBe(true);
  expect(comparison.improvement).toBe(10);
  expect(comparison.improvementPercent).toBeCloseTo(12.5, 1);
});

test('updatePRs adds new PR', () => {
  const result = updatePRs([], {
    exerciseId: 'squat', exerciseName: 'Squat', value: 120, unit: 'kg', attemptedAt: '2026-01-01',
  });
  expect(result).toHaveLength(1);
  expect(result[0].bestValue).toBe(120);
});

test('updatePRs does not add non-PR', () => {
  const existing: PersonalRecord[] = [
    { exerciseId: 'squat', exerciseName: 'Squat', bestValue: 120, unit: 'kg', achievedAt: '2025-12-01' },
  ];
  const result = updatePRs(existing, {
    exerciseId: 'squat', exerciseName: 'Squat', value: 100, unit: 'kg', attemptedAt: '2026-01-01',
  });
  expect(result).toHaveLength(1);
  expect(result[0].bestValue).toBe(120);
});

test('updatePRs replaces existing PR on improvement', () => {
  const existing: PersonalRecord[] = [
    { exerciseId: 'dead', exerciseName: 'Deadlift', bestValue: 140, unit: 'kg', achievedAt: '2025-12-01' },
  ];
  const result = updatePRs(existing, {
    exerciseId: 'dead', exerciseName: 'Deadlift', value: 150, unit: 'kg', attemptedAt: '2026-01-01',
  });
  expect(result).toHaveLength(1);
  expect(result[0].bestValue).toBe(150);
  expect(result[0].previousBest).toBe(140);
});

test('formatPRValue for kg', () => {
  expect(formatPRValue(100, 'kg')).toBe('100 kg');
});

test('formatPRValue for reps', () => {
  expect(formatPRValue(12, 'reps')).toBe('12 reps');
});

test('formatPRValue for km', () => {
  expect(formatPRValue(5.432, 'km')).toBe('5.43 km');
});

test('formatPRValue for seconds under 60', () => {
  expect(formatPRValue(45, 'sec')).toBe('45s');
});

test('formatPRValue for seconds 60+', () => {
  expect(formatPRValue(125, 'sec')).toBe('2:05');
});

test('countTotalPRs counts correctly', () => {
  const prs: PersonalRecord[] = [
    { exerciseId: 'a', exerciseName: 'A', bestValue: 1, unit: 'kg', achievedAt: '' },
    { exerciseId: 'b', exerciseName: 'B', bestValue: 2, unit: 'reps', achievedAt: '' },
  ];
  expect(countTotalPRs(prs)).toBe(2);
});

test('countTotalPRs zero for empty', () => {
  expect(countTotalPRs([])).toBe(0);
});
