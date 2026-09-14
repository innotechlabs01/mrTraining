import {
  calculateStreak,
  mergeWorkoutDate,
  toLocalDateStr,
  parseLocalDate,
} from '../domain/streakService';

test('empty days returns zero streak', () => {
  const result = calculateStreak([]);
  expect(result.current).toBe(0);
  expect(result.longest).toBe(0);
  expect(result.completedToday).toBe(false);
});

test('single day streak of 1', () => {
  const today = toLocalDateStr(new Date());
  const result = calculateStreak([today]);
  expect(result.current).toBe(1);
  expect(result.longest).toBe(1);
  expect(result.completedToday).toBe(true);
});

test('consecutive 7-day streak', () => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(toLocalDateStr(d));
  }
  const result = calculateStreak(days);
  expect(result.current).toBe(7);
  expect(result.longest).toBe(7);
  expect(result.completedToday).toBe(true);
});

test('streak broken in middle — current resets but longest preserved', () => {
  const now = new Date();
  const days: string[] = [];
  // 5 days, skip 1, 3 more days
  for (let i = 9; i >= 5; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(toLocalDateStr(d));
  }
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(toLocalDateStr(d));
  }
  const result = calculateStreak(days);
  expect(result.longest).toBe(5);
  expect(result.current).toBe(3);
});

test('mergeWorkoutDate deduplicates and sorts', () => {
  const existing = ['2026-01-05', '2026-01-07'];
  const merged = mergeWorkoutDate(existing, '2026-01-06');
  expect(merged).toEqual(['2026-01-05', '2026-01-06', '2026-01-07']);
});

test('mergeWorkoutDate handles duplicate add', () => {
  const existing = ['2026-01-05'];
  const merged = mergeWorkoutDate(existing, '2026-01-05');
  expect(merged).toEqual(['2026-01-05']);
});

test('toLocalDateStr produces YYYY-MM-DD', () => {
  const d = new Date(2026, 0, 5); // Jan 5, 2026
  expect(toLocalDateStr(d)).toBe('2026-01-05');
});

test('parseLocalDate round-trips', () => {
  const str = '2026-03-15';
  const d = parseLocalDate(str);
  expect(toLocalDateStr(d)).toBe(str);
});
