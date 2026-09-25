import { nextOccurrence, parseISODate, toISODate } from '../planSchedule';

describe('toISODate / parseISODate', () => {
  it('round-trips a local date', () => {
    const d = new Date(2026, 8, 17);
    expect(toISODate(d)).toBe('2026-09-17');
    expect(parseISODate('2026-09-17')?.getDate()).toBe(17);
  });

  it('returns null for invalid input', () => {
    expect(parseISODate('')).toBeNull();
    expect(parseISODate('not-a-date')).toBeNull();
  });
});

describe('nextOccurrence', () => {
  // 2026-09-17 is a Thursday (day 4).
  const from = '2026-09-17';

  it('returns the next matching weekday inside the window (Fri after Thu)', () => {
    const date = nextOccurrence(
      { startDate: '2026-09-07', endDate: '2026-09-30', daysOfWeek: [1, 3, 5] },
      from,
    );
    expect(date).toBe('2026-09-18');
  });

  it('returns null when the window already closed', () => {
    const date = nextOccurrence(
      { startDate: '2026-08-01', endDate: '2026-09-15', daysOfWeek: [1, 3, 5] },
      from,
    );
    expect(date).toBeNull();
  });

  it('starts recurrence at the window start when it is in the future', () => {
    const date = nextOccurrence(
      { startDate: '2026-09-25', endDate: '2026-10-10', daysOfWeek: [1, 3, 5] },
      from,
    );
    expect(date).toBe('2026-09-25');
  });

  it('treats empty daysOfWeek as a one-off start date', () => {
    expect(nextOccurrence({ startDate: '2026-09-20', endDate: '', daysOfWeek: [] }, from)).toBe('2026-09-20');
    expect(nextOccurrence({ startDate: '2026-09-10', endDate: '', daysOfWeek: [] }, from)).toBeNull();
  });

  it('returns the reference day itself when it is a plan day', () => {
    // Thursday is in daysOfWeek and the reference date is a Thursday.
    const date = nextOccurrence(
      { startDate: '2026-09-01', endDate: '2026-09-30', daysOfWeek: [4] },
      from,
    );
    expect(date).toBe('2026-09-17');
  });

  it('returns null when the plan has no days left in the window', () => {
    const date = nextOccurrence(
      { startDate: '2026-09-01', endDate: '2026-09-18', daysOfWeek: [1] },
      from,
    );
    expect(date).toBeNull();
  });
});